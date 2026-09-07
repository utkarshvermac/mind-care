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
/**
 * PERFORMANCE NOTE: this used to check one day at a time in a loop (up to
 * 400 iterations x 2 queries each) — very slow on a network-hop database
 * like Atlas. It now fetches every active date once and checks the streak
 * in memory.
 */
async function computeStreak(userId) {
  const rangeStartKey = dateKeyDaysAgo(399)
  const rangeStart = new Date(`${rangeStartKey}T00:00:00.000Z`)

  const [gameDates, activityDates] = await Promise.all([
    GameResult.find({ userId, playedAt: { $gte: rangeStart } }).select("playedAt").lean(),
    ActivityCompletion.find({ userId, done: true, date: { $gte: rangeStartKey } }).select("date").lean(),
  ])

  const activeDays = new Set()
  for (const g of gameDates) activeDays.add(g.playedAt.toISOString().slice(0, 10))
  for (const a of activityDates) activeDays.add(a.date)

  let streak = 0
  for (let i = 0; i < 400; i++) {
    if (activeDays.has(dateKeyDaysAgo(i))) streak++
    else break
  }
  return streak
}

/** % change in average accuracy this week (last 7 days) vs the 7 days before that. */
async function computeWeeklyChange(userId) {
  const thisWeekStart = new Date(`${dateKeyDaysAgo(6)}T00:00:00.000Z`)
  const lastWeekStart = new Date(`${dateKeyDaysAgo(13)}T00:00:00.000Z`)

  const [thisWeek, lastWeek] = await Promise.all([
    GameResult.find({ userId, playedAt: { $gte: thisWeekStart } }).lean(),
    GameResult.find({ userId, playedAt: { $gte: lastWeekStart, $lt: thisWeekStart } }).lean(),
  ])

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
  const [total, done] = await Promise.all([
    Activity.countDocuments({ userId }),
    ActivityCompletion.countDocuments({ userId, date: todayKey(), done: true }),
  ])
  return { done, total }
}

/** Builds the same shape the frontend's `patientProfile` mock object used. */
async function getPatientProfile(userId) {
  const [user, profile, recent5, recent20, activityCounts, weeklyChange, streak, caregiverName] = await Promise.all([
    User.findById(userId).lean(),
    PatientProfile.findById(userId).lean(),
    GameResult.find({ userId }).sort({ playedAt: -1 }).limit(5).lean(),
    GameResult.find({ userId }).sort({ playedAt: -1 }).limit(20).lean(),
    todayActivityCounts(userId),
    computeWeeklyChange(userId),
    computeStreak(userId),
    findLinkedCaregiverName(userId),
  ])
  if (!user) return null

  const base = profile ? profile.cognitiveScoreBase : 70
  const liveAccuracy = avgAccuracy(recent5)
  const cognitiveScore = liveAccuracy === null ? base : Math.round((base + liveAccuracy) / 2)
  const accuracy = avgAccuracy(recent20) ?? 0

  return {
    id: user._id,
    name: user.name,
    firstName: firstNameOf(user.name),
    age: profile ? profile.age : null,
    role: "patient",
    initials: user.initials,
    condition: profile ? profile.condition : "Memory & cognitive care plan",
    since: profile ? profile.careSince : null,
    phone: profile ? profile.phone : null,
    cognitiveScore,
    weeklyChange,
    streak,
    accuracy,
    activitiesDone: activityCounts.done,
    activitiesTotal: activityCounts.total,
    caregiver: caregiverName,
  }
}

/** Builds the same shape the frontend's `caregiverProfile` mock object used. */
async function getCaregiverProfile(userId) {
  const [user, profile, patientCount] = await Promise.all([
    User.findById(userId).lean(),
    CaregiverProfile.findById(userId).lean(),
    countLinkedPatients(userId),
  ])
  if (!user) return null

  return {
    id: user._id,
    name: user.name,
    firstName: firstNameOf(user.name),
    role: "caregiver",
    initials: user.initials,
    relation: profile ? profile.relation : "Caregiver",
    phone: profile ? profile.phone : null,
    patients: patientCount,
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
