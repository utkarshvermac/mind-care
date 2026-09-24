const express = require("express")
const WellnessLog = require("../models/WellnessLog")
const Activity = require("../models/Activity")
const ActivityCompletion = require("../models/ActivityCompletion")
const CaregiverWellnessLog = require("../models/CaregiverWellnessLog")
const asyncHandler = require("../utils/asyncHandler")
const { assert, ApiError } = require("../utils/ApiError")
const { requireAuth, requireRole } = require("../middleware/auth")
const { resolveTargetPatientId } = require("../services/profileService")
const { todayKey } = require("../utils/dates")

const router = express.Router()

const SELF_CARE_TIPS = [
  "A five-minute break with no phone counts as real rest. Try one today.",
  "Caring for someone is easier when you're not running on empty — drink some water and sit down for a moment.",
  "It's okay to ask another family member to take a shift this week.",
  "Naming how you feel, even just to yourself, takes some of the weight off.",
  "A short walk outside can reset a stressful morning.",
]

function tipFor(stress) {
  if (!stress) return SELF_CARE_TIPS[0]
  return SELF_CARE_TIPS[Math.min(SELF_CARE_TIPS.length - 1, stress - 1)]
}

async function getOrCreateCaregiverLog(userId) {
  const date = todayKey()
  let doc = await CaregiverWellnessLog.findOne({ userId, date })
  if (!doc) doc = await CaregiverWellnessLog.create({ userId, date })
  return doc
}

function shapedCaregiverLog(doc) {
  return { date: doc.date, mood: doc.mood, stress: doc.stress, note: doc.note, tip: tipFor(doc.stress) }
}

// GET /api/wellness/caregiver-today — the signed-in caregiver's own check-in for today.
router.get(
  "/caregiver-today",
  requireAuth,
  requireRole("caregiver"),
  asyncHandler(async (req, res) => {
    res.json(shapedCaregiverLog(await getOrCreateCaregiverLog(req.user.id)))
  }),
)

// PATCH /api/wellness/caregiver-today   { mood?, stress?, note? }
router.patch(
  "/caregiver-today",
  requireAuth,
  requireRole("caregiver"),
  asyncHandler(async (req, res) => {
    const current = await getOrCreateCaregiverLog(req.user.id)
    const body = req.body || {}

    if (Number.isInteger(body.mood) && body.mood >= 1 && body.mood <= 5) current.mood = body.mood
    if (Number.isInteger(body.stress) && body.stress >= 1 && body.stress <= 5) current.stress = body.stress
    if (typeof body.note === "string") current.note = body.note.trim().slice(0, 500)

    await current.save()
    res.json(shapedCaregiverLog(current))
  }),
)

async function getOrCreateTodayLog(userId) {
  const date = todayKey()
  let doc = await WellnessLog.findOne({ userId, date })
  if (!doc) {
    doc = await WellnessLog.create({
      userId,
      date,
      mood: "Good",
      sleepHours: 7.5,
      waterGlasses: 0,
      waterGoal: 8,
      steps: 0,
      stepGoal: 4000,
    })
  }
  return doc
}

async function activitiesWithCompletion(userId) {
  const date = todayKey()
  const activities = await Activity.find({ userId }).sort({ sortOrder: 1 }).lean()
  const completions = await ActivityCompletion.find({ userId, date }).lean()
  const doneMap = new Map(completions.map((c) => [String(c.activityId), c.done]))

  return activities.map((a) => ({
    id: String(a._id),
    title: a.title,
    timeLabel: a.timeLabel,
    done: Boolean(doneMap.get(String(a._id))),
  }))
}

async function shapedToday(userId) {
  const log = await getOrCreateTodayLog(userId)
  const activities = await activitiesWithCompletion(userId)
  const doneCount = activities.filter((a) => a.done).length

  return {
    date: log.date,
    mood: log.mood,
    sleepHours: log.sleepHours,
    water: { glasses: log.waterGlasses, goal: log.waterGoal },
    steps: { count: log.steps, goal: log.stepGoal },
    activities,
    activitiesDone: doneCount,
    activitiesTotal: activities.length,
  }
}

// GET /api/wellness/today?patientId=
router.get(
  "/today",
  requireAuth,
  asyncHandler(async (req, res) => {
    const targetId = await resolveTargetPatientId(req.user, req.query.patientId)
    res.json(await shapedToday(targetId))
  }),
)

// PATCH /api/wellness/today   { water?, mood?, sleepHours?, steps? }
// Updates today's wellness log fields. Patient-only (a caregiver can view, not edit).
router.patch(
  "/today",
  requireAuth,
  requireRole("patient"),
  asyncHandler(async (req, res) => {
    const current = await getOrCreateTodayLog(req.user.id)
    const body = req.body || {}

    if (typeof body.mood === "string") current.mood = body.mood
    if (typeof body.sleepHours === "number") current.sleepHours = body.sleepHours
    if (typeof body.water === "number") {
      current.waterGlasses = Math.max(0, Math.min(current.waterGoal, Math.round(body.water)))
    }
    if (typeof body.steps === "number") current.steps = Math.max(0, Math.round(body.steps))

    await current.save()
    res.json(await shapedToday(req.user.id))
  }),
)

// PATCH /api/wellness/today/activities/:activityId   { done }
router.patch(
  "/today/activities/:activityId",
  requireAuth,
  requireRole("patient"),
  asyncHandler(async (req, res) => {
    const activity = await Activity.findOne({ _id: req.params.activityId, userId: req.user.id })
    if (!activity) throw new ApiError(404, "Activity not found.")

    const done = req.body?.done !== false
    const date = todayKey()

    await ActivityCompletion.findOneAndUpdate(
      { activityId: activity._id, date },
      { activityId: activity._id, userId: req.user.id, date, done },
      { upsert: true },
    )

    res.json(await shapedToday(req.user.id))
  }),
)

// POST /api/wellness/activities   { title, timeLabel }  — add a new checklist item
router.post(
  "/activities",
  requireAuth,
  requireRole("patient"),
  asyncHandler(async (req, res) => {
    const { title, timeLabel } = req.body || {}
    assert(typeof title === "string" && title.trim(), 400, "title is required.")
    assert(typeof timeLabel === "string" && timeLabel.trim(), 400, "timeLabel is required.")

    const count = await Activity.countDocuments({ userId: req.user.id })
    await Activity.create({ userId: req.user.id, title: title.trim(), timeLabel: timeLabel.trim(), sortOrder: count })

    res.status(201).json(await shapedToday(req.user.id))
  }),
)

// DELETE /api/wellness/activities/:activityId
router.delete(
  "/activities/:activityId",
  requireAuth,
  requireRole("patient"),
  asyncHandler(async (req, res) => {
    const result = await Activity.deleteOne({ _id: req.params.activityId, userId: req.user.id })
    if (result.deletedCount === 0) throw new ApiError(404, "Activity not found.")
    res.json(await shapedToday(req.user.id))
  }),
)

module.exports = router
