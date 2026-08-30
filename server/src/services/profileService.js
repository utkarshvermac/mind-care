const db = require("../db")
const { dateKeyDaysAgo, dateKeyOf, relativeDayLabel } = require("../utils/dates")
const { ApiError } = require("../utils/ApiError")

function firstNameOf(name) {
  return name.trim().split(/\s+/)[0]
}

function avgAccuracy(rows) {
  if (rows.length === 0) return null
  return Math.round(rows.reduce((sum, r) => sum + r.accuracy, 0) / rows.length)
}

/** Consecutive days (ending today) with a game session or a completed activity. */
function computeStreak(userId) {
  let streak = 0
  for (let i = 0; i < 400; i++) {
    const key = dateKeyDaysAgo(i)
    const hasGame = db
      .prepare("SELECT 1 FROM game_results WHERE user_id = ? AND substr(played_at,1,10) = ? LIMIT 1")
      .get(userId, key)
    const hasActivity = db
      .prepare("SELECT 1 FROM activity_completions WHERE user_id = ? AND date = ? AND done = 1 LIMIT 1")
      .get(userId, key)
    if (hasGame || hasActivity) {
      streak++
    } else {
      break
    }
  }
  return streak
}

/** % change in average accuracy this week (last 7 days) vs the 7 days before that. */
function computeWeeklyChange(userId) {
  const thisWeekStart = dateKeyDaysAgo(6)
  const lastWeekStart = dateKeyDaysAgo(13)

  const thisWeek = db
    .prepare("SELECT accuracy FROM game_results WHERE user_id = ? AND substr(played_at,1,10) >= ?")
    .all(userId, thisWeekStart)
  const lastWeek = db
    .prepare(
      "SELECT accuracy FROM game_results WHERE user_id = ? AND substr(played_at,1,10) >= ? AND substr(played_at,1,10) < ?",
    )
    .all(userId, lastWeekStart, thisWeekStart)

  const thisAvg = avgAccuracy(thisWeek)
  const lastAvg = avgAccuracy(lastWeek)

  if (thisAvg === null) return 0
  if (lastAvg === null) return Math.max(0, thisAvg - 75) // no baseline: compare against a neutral 75
  return thisAvg - lastAvg
}

function findLinkedCaregiverName(patientId) {
  const row = db
    .prepare(
      `SELECT u.name FROM care_links cl
       JOIN users u ON u.id = cl.caregiver_id
       WHERE cl.patient_id = ?
       ORDER BY cl.created_at ASC LIMIT 1`,
    )
    .get(patientId)
  return row ? row.name : null
}

function findLinkedPatient(caregiverId) {
  return db
    .prepare(
      `SELECT u.* FROM care_links cl
       JOIN users u ON u.id = cl.patient_id
       WHERE cl.caregiver_id = ?
       ORDER BY cl.created_at ASC LIMIT 1`,
    )
    .get(caregiverId)
}

function countLinkedPatients(caregiverId) {
  const row = db.prepare("SELECT COUNT(*) AS n FROM care_links WHERE caregiver_id = ?").get(caregiverId)
  return row.n
}

function todayActivityCounts(userId) {
  const totalRow = db.prepare("SELECT COUNT(*) AS n FROM activities WHERE user_id = ?").get(userId)
  const doneRow = db
    .prepare(
      `SELECT COUNT(*) AS n FROM activity_completions
       WHERE user_id = ? AND date = (SELECT date('now')) AND done = 1`,
    )
    .get(userId)
  return { done: doneRow.n, total: totalRow.n }
}

/** Builds the same shape the frontend's `patientProfile` mock object used. */
function getPatientProfile(userId) {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId)
  if (!user) return null
  const profile = db.prepare("SELECT * FROM patient_profiles WHERE user_id = ?").get(userId)

  const recent5 = db
    .prepare("SELECT * FROM game_results WHERE user_id = ? ORDER BY played_at DESC LIMIT 5")
    .all(userId)
  const recent20 = db
    .prepare("SELECT * FROM game_results WHERE user_id = ? ORDER BY played_at DESC LIMIT 20")
    .all(userId)

  const base = profile ? profile.cognitive_score_base : 70
  const liveAccuracy = avgAccuracy(recent5)
  const cognitiveScore = liveAccuracy === null ? base : Math.round((base + liveAccuracy) / 2)
  const accuracy = avgAccuracy(recent20) ?? 0
  const { done, total } = todayActivityCounts(userId)

  return {
    id: user.id,
    name: user.name,
    firstName: firstNameOf(user.name),
    age: profile ? profile.age : null,
    role: "patient",
    initials: user.initials,
    condition: profile ? profile.condition : "Memory & cognitive care plan",
    since: profile ? profile.care_since : null,
    cognitiveScore,
    weeklyChange: computeWeeklyChange(userId),
    streak: computeStreak(userId),
    accuracy,
    activitiesDone: done,
    activitiesTotal: total,
    caregiver: findLinkedCaregiverName(user.id),
  }
}

/** Builds the same shape the frontend's `caregiverProfile` mock object used. */
function getCaregiverProfile(userId) {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId)
  if (!user) return null
  const profile = db.prepare("SELECT * FROM caregiver_profiles WHERE user_id = ?").get(userId)

  return {
    id: user.id,
    name: user.name,
    firstName: firstNameOf(user.name),
    role: "caregiver",
    initials: user.initials,
    relation: profile ? profile.relation : "Caregiver",
    patients: countLinkedPatients(userId),
  }
}

/** Recent game sessions shaped like the frontend's `recentActivity` list. */
function getRecentActivity(userId, limit = 3) {
  const rows = db
    .prepare("SELECT * FROM game_results WHERE user_id = ? ORDER BY played_at DESC LIMIT ?")
    .all(userId, limit)
  return rows.map((r) => ({
    game: r.game,
    accuracy: r.accuracy,
    score: r.score,
    when: r.played_at,
    whenLabel: relativeDayLabel(r.played_at),
  }))
}

/**
 * Figures out which patient's data a request should read.
 * - A patient user always resolves to themself.
 * - A caregiver may pass ?patientId=... for one of their linked patients,
 *   or omit it to fall back to their first (default) linked patient.
 */
function resolveTargetPatientId(user, queryPatientId) {
  if (user.role === "patient") return user.id

  if (queryPatientId) {
    const link = db
      .prepare("SELECT 1 FROM care_links WHERE caregiver_id = ? AND patient_id = ?")
      .get(user.id, queryPatientId)
    if (!link) throw new ApiError(403, "That patient is not linked to your caregiver account")
    return queryPatientId
  }

  const patient = findLinkedPatient(user.id)
  if (!patient) throw new ApiError(404, "No patient is linked to your caregiver account yet")
  return patient.id
}

module.exports = {
  firstNameOf,
  computeStreak,
  computeWeeklyChange,
  findLinkedCaregiverName,
  findLinkedPatient,
  countLinkedPatients,
  todayActivityCounts,
  getPatientProfile,
  getCaregiverProfile,
  getRecentActivity,
  resolveTargetPatientId,
  avgAccuracy,
  dateKeyOf,
}
