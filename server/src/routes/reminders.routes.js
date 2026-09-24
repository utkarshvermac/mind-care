const express = require("express")
const Reminder = require("../models/Reminder")
const ReminderCompletion = require("../models/ReminderCompletion")
const asyncHandler = require("../utils/asyncHandler")
const { assert, ApiError } = require("../utils/ApiError")
const { requireAuth, requireRole } = require("../middleware/auth")
const { resolveTargetPatientId } = require("../services/profileService")
const { todayKey } = require("../utils/dates")

const router = express.Router()

async function shapedReminders(userId) {
  const rows = await Reminder.find({ userId }).sort({ sortOrder: 1 })
  if (rows.length === 0) return []

  const date = todayKey()
  const completions = await ReminderCompletion.find({
    userId,
    date,
    reminderId: { $in: rows.map((r) => r._id) },
  }).lean()
  const doneIds = new Set(completions.filter((c) => c.done).map((c) => String(c.reminderId)))

  return rows.map((doc) => ({
    id: String(doc._id),
    title: doc.title,
    time: doc.timeLabel,
    kind: doc.kind,
    taken: doneIds.has(String(doc._id)),
  }))
}

// GET /api/reminders?patientId=
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const targetId = await resolveTargetPatientId(req.user, req.query.patientId)
    res.json({ reminders: await shapedReminders(targetId) })
  }),
)

// POST /api/reminders   { title, time, kind }
router.post(
  "/",
  requireAuth,
  requireRole("patient"),
  asyncHandler(async (req, res) => {
    const { title, time, kind } = req.body || {}
    assert(typeof title === "string" && title.trim(), 400, "title is required.")
    assert(typeof time === "string" && time.trim(), 400, "time is required.")
    assert(typeof kind === "string" && kind.trim(), 400, "kind is required.")

    const count = await Reminder.countDocuments({ userId: req.user.id })
    await Reminder.create({
      userId: req.user.id,
      title: title.trim(),
      timeLabel: time.trim(),
      kind: kind.trim(),
      sortOrder: count,
    })

    res.status(201).json({ reminders: await shapedReminders(req.user.id) })
  }),
)

// PATCH /api/reminders/:id/complete   { done }
// Marks (or unmarks) a reminder as done for today - this is what powers
// medication-confirmation ("did you take it?") and feeds the caregiver
// missed-medication alert.
router.patch(
  "/:id/complete",
  requireAuth,
  requireRole("patient"),
  asyncHandler(async (req, res) => {
    const reminder = await Reminder.findOne({ _id: req.params.id, userId: req.user.id })
    if (!reminder) throw new ApiError(404, "Reminder not found.")

    const done = req.body?.done !== false
    const date = todayKey()

    await ReminderCompletion.findOneAndUpdate(
      { reminderId: reminder._id, date },
      { reminderId: reminder._id, userId: req.user.id, date, done },
      { upsert: true },
    )

    res.json({ reminders: await shapedReminders(req.user.id) })
  }),
)

// DELETE /api/reminders/:id
router.delete(
  "/:id",
  requireAuth,
  requireRole("patient"),
  asyncHandler(async (req, res) => {
    const result = await Reminder.deleteOne({ _id: req.params.id, userId: req.user.id })
    if (result.deletedCount === 0) throw new ApiError(404, "Reminder not found.")
    res.status(204).end()
  }),
)

module.exports = router
