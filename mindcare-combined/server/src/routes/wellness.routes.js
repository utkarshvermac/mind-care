const express = require("express")
const crypto = require("crypto")
const db = require("../db")
const asyncHandler = require("../utils/asyncHandler")
const { assert, ApiError } = require("../utils/ApiError")
const { requireAuth, requireRole } = require("../middleware/auth")
const { resolveTargetPatientId } = require("../services/profileService")
const { todayKey } = require("../utils/dates")

const router = express.Router()

function getOrCreateTodayLog(userId) {
  const date = todayKey()
  let row = db.prepare("SELECT * FROM wellness_logs WHERE user_id = ? AND date = ?").get(userId, date)
  if (!row) {
    const id = crypto.randomUUID()
    db.prepare(
      "INSERT INTO wellness_logs (id, user_id, date, mood, sleep_hours, water_glasses, water_goal, steps, step_goal) VALUES (?, ?, ?, 'Good', 7.5, 0, 8, 0, 4000)",
    ).run(id, userId, date)
    row = db.prepare("SELECT * FROM wellness_logs WHERE id = ?").get(id)
  }
  return row
}

function activitiesWithCompletion(userId) {
  const date = todayKey()
  return db
    .prepare(
      `SELECT a.id, a.title, a.time_label as timeLabel,
              COALESCE(c.done, 0) as done
       FROM activities a
       LEFT JOIN activity_completions c ON c.activity_id = a.id AND c.date = ?
       WHERE a.user_id = ?
       ORDER BY a.sort_order ASC`,
    )
    .all(date, userId)
    .map((r) => ({ ...r, done: Boolean(r.done) }))
}

function shapedToday(userId) {
  const log = getOrCreateTodayLog(userId)
  const activities = activitiesWithCompletion(userId)
  const doneCount = activities.filter((a) => a.done).length

  return {
    date: log.date,
    mood: log.mood,
    sleepHours: log.sleep_hours,
    water: { glasses: log.water_glasses, goal: log.water_goal },
    steps: { count: log.steps, goal: log.step_goal },
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
    const targetId = resolveTargetPatientId(req.user, req.query.patientId)
    res.json(shapedToday(targetId))
  }),
)

// PATCH /api/wellness/today   { water?, mood?, sleepHours?, steps? }
// Updates today's wellness log fields. Patient-only (a caregiver can view, not edit).
router.patch(
  "/today",
  requireAuth,
  requireRole("patient"),
  asyncHandler(async (req, res) => {
    const current = getOrCreateTodayLog(req.user.id)
    const body = req.body || {}

    const next = {
      mood: typeof body.mood === "string" ? body.mood : current.mood,
      sleep_hours: typeof body.sleepHours === "number" ? body.sleepHours : current.sleep_hours,
      water_glasses:
        typeof body.water === "number"
          ? Math.max(0, Math.min(current.water_goal, Math.round(body.water)))
          : current.water_glasses,
      steps: typeof body.steps === "number" ? Math.max(0, Math.round(body.steps)) : current.steps,
    }

    db.prepare(
      "UPDATE wellness_logs SET mood=?, sleep_hours=?, water_glasses=?, steps=? WHERE id = ?",
    ).run(next.mood, next.sleep_hours, next.water_glasses, next.steps, current.id)

    res.json(shapedToday(req.user.id))
  }),
)

// PATCH /api/wellness/today/activities/:activityId   { done }
router.patch(
  "/today/activities/:activityId",
  requireAuth,
  requireRole("patient"),
  asyncHandler(async (req, res) => {
    const activity = db
      .prepare("SELECT * FROM activities WHERE id = ? AND user_id = ?")
      .get(req.params.activityId, req.user.id)
    if (!activity) throw new ApiError(404, "Activity not found.")

    const done = req.body?.done !== false
    const date = todayKey()

    db.prepare(
      `INSERT INTO activity_completions (id, activity_id, user_id, date, done)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(activity_id, date) DO UPDATE SET done = excluded.done`,
    ).run(crypto.randomUUID(), activity.id, req.user.id, date, done ? 1 : 0)

    res.json(shapedToday(req.user.id))
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

    const countRow = db.prepare("SELECT COUNT(*) AS n FROM activities WHERE user_id = ?").get(req.user.id)
    db.prepare("INSERT INTO activities (id, user_id, title, time_label, sort_order) VALUES (?, ?, ?, ?, ?)").run(
      crypto.randomUUID(),
      req.user.id,
      title.trim(),
      timeLabel.trim(),
      countRow.n,
    )

    res.status(201).json(shapedToday(req.user.id))
  }),
)

// DELETE /api/wellness/activities/:activityId
router.delete(
  "/activities/:activityId",
  requireAuth,
  requireRole("patient"),
  asyncHandler(async (req, res) => {
    const result = db
      .prepare("DELETE FROM activities WHERE id = ? AND user_id = ?")
      .run(req.params.activityId, req.user.id)
    if (result.changes === 0) throw new ApiError(404, "Activity not found.")
    res.json(shapedToday(req.user.id))
  }),
)

module.exports = router
