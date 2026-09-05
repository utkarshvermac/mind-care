const User = require("../models/User")
const PatientProfile = require("../models/PatientProfile")
const CaregiverProfile = require("../models/CaregiverProfile")
const CareLink = require("../models/CareLink")
const GameResult = require("../models/GameResult")
const Activity = require("../models/Activity")
const ActivityCompletion = require("../models/ActivityCompletion")
const { dateKeyDaysAgo, todayKey, relativeDayLabel } = require("../utils/dates")
const { ApiError } = require("../utils/ApiError")

function firstNameOf(name) {
  return name.trim().split(/\s+/)[0]
}

function avgAccuracy(rows) {
  if (rows.length === 0) return null
  return Math.round(rows.reduce((sum, r) => sum + r.accuracy, 0) / rows.length)
}

/** Consecutive days (ending today) with a game session or a completed activity. */
async function computeStreak(userId) {
  let streak = 0
  for (let i = 0; i < 400; i++) {
    const key = dateKeyDaysAgo(i)
    const nextKey = dateKeyDaysAgo(i - 1)
    const hasGame = await GameResult.exists({
      userId,
      playedAt: { $gte: new Date(`${key}T00:00:00.000Z`), $lt: new Date(`${nextKey}T00:00:00.000Z`) },
    })
    const hasActivity = await ActivityCompletion.exists({ userId, date: key, done: true })
    if (hasGame || hasActivity) {
      streak++
    } else {
      break
    }
  }
  return streak
}

/** % change in average accuracy this week (last 7 days) vs the 7 days before that. */
async function computeWeeklyChange(userId) {
  const thisWeekStart = new Date(`${dateKeyDaysAgo(6)}T00:00:00.000Z`)
  const lastWeekStart = new Date(`${dateKeyDaysAgo(13)}T00:00:00.000Z`)

  const thisWeek = await GameResult.find({ userId, playedAt: { $gte: thisWeekStart } }).lean()
  const lastWeek = await GameResult.find({
    userId,
    playedAt: { $gte: lastWeekStart, $lt: thisWeekStart },
  }).lean()

  const thisAvg = avgAccuracy(thisWeek)
  const lastAvg = avgAccuracy(lastWeek)

  if (thisAvg === null) return 0
  if (lastAvg === null) return Math.max(0, thisAvg - 75) // no baseline: compare against a neutral 75
  return thisAvg - lastAvg
}

async function findLinkedCaregiverName(patientId) {
  const link = await CareLink.findOne({ patientId }).sort({ createdAt: 1 }).lean()
  if (!link) return null
  const caregiver = await User.findById(link.caregiverId).lean()
  return caregiver ? caregiver.name : null
}

/** The caregiver's earliest-linked patient — used as the default when no ?patientId is given. */
async function findLinkedPatient(caregiverId) {
  const link = await CareLink.findOne({ caregiverId }).sort({ createdAt: 1 }).lean()
  if (!link) return null
  const patient = await User.findById(link.patientId).lean()
  if (patient) patient.id = patient._id
  return patient
}

/** Every patient linked to this caregiver, in the order they were linked. */
async function listLinkedPatients(caregiverId) {
  const links = await CareLink.find({ caregiverId }).sort({ createdAt: 1 }).lean()
  if (links.length === 0) return []
  const patients = await User.find({ _id: { $in: links.map((l) => l.patientId) } }).lean()
  const byId = new Map(patients.map((p) => [p._id, p]))
  return links.map((l) => byId.get(l.patientId)).filter(Boolean)
}

async function countLinkedPatients(caregiverId) {
  return CareLink.countDocuments({ caregiverId })
}

async function todayActivityCounts(userId) {
  const total = await Activity.countDocuments({ userId })
  const done = await ActivityCompletion.countDocuments({ userId, date: todayKey(), done: true })
  return { done, total }
}

/** Builds the same shape the frontend's `patientProfile` mock object used. */
async function getPatientProfile(userId) {
  const user = await User.findById(userId).lean()
  if (!user) return null
  const profile = await PatientProfile.findById(userId).lean()

  const recent5 = await GameResult.find({ userId }).sort({ playedAt: -1 }).limit(5).lean()
  const recent20 = await GameResult.find({ userId }).sort({ playedAt: -1 }).limit(20).lean()

  const base = profile ? profile.cognitiveScoreBase : 70
  const liveAccuracy = avgAccuracy(recent5)
  const cognitiveScore = liveAccuracy === null ? base : Math.round((base + liveAccuracy) / 2)
  const accuracy = avgAccuracy(recent20) ?? 0
  const { done, total } = await todayActivityCounts(userId)

  return {
    id: user._id,
    name: user.name,
    firstName: firstNameOf(user.name),
    age: profile ? profile.age : null,
    role: "patient",
    initials: user.initials,
    condition: profile ? profile.condition : "Memory & cognitive care plan",
    since: profile ? profile.careSince : null,
    cognitiveScore,
    weeklyChange: await computeWeeklyChange(userId),
    streak: await computeStreak(userId),
    accuracy,
    activitiesDone: done,
    activitiesTotal: total,
    caregiver: await findLinkedCaregiverName(user._id),
  }
}

/** Builds the same shape the frontend's `caregiverProfile` mock object used. */
async function getCaregiverProfile(userId) {
  const user = await User.findById(userId).lean()
  if (!user) return null
  const profile = await CaregiverProfile.findById(userId).lean()

  return {
    id: user._id,
    name: user.name,
    firstName: firstNameOf(user.name),
    role: "caregiver",
    initials: user.initials,
    relation: profile ? profile.relation : "Caregiver",
    patients: await countLinkedPatients(userId),
  }
}

/** Recent game sessions shaped like the frontend's `recentActivity` list. */
async function getRecentActivity(userId, limit = 3) {
  const rows = await GameResult.find({ userId }).sort({ playedAt: -1 }).limit(limit).lean()
  return rows.map((r) => ({
    game: r.game,
    accuracy: r.accuracy,
    score: r.score,
    when: r.playedAt.toISOString(),
    whenLabel: relativeDayLabel(r.playedAt.toISOString()),
  }))
}

/**
 * Figures out which patient's data a request should read.
 * - A patient user always resolves to themself.
 * - A caregiver may pass ?patientId=... for one of their linked patients,
 *   or omit it to fall back to their first (default) linked patient.
 */
async function resolveTargetPatientId(user, queryPatientId) {
  if (user.role === "patient") return user.id

  if (queryPatientId) {
    const link = await CareLink.exists({ caregiverId: user.id, patientId: queryPatientId })
    if (!link) throw new ApiError(403, "That patient is not linked to your caregiver account")
    return queryPatientId
  }

  const patient = await findLinkedPatient(user.id)
  if (!patient) throw new ApiError(404, "No patient is linked to your caregiver account yet")
  return patient.id
}

module.exports = {
  firstNameOf,
  computeStreak,
  computeWeeklyChange,
  findLinkedCaregiverName,
  findLinkedPatient,
  listLinkedPatients,
  countLinkedPatients,
  todayActivityCounts,
  getPatientProfile,
  getCaregiverProfile,
  getRecentActivity,
  resolveTargetPatientId,
  avgAccuracy,
}
