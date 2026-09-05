const express = require("express")
const Reminder = require("../models/Reminder")
const asyncHandler = require("../utils/asyncHandler")
const { assert, ApiError } = require("../utils/ApiError")
const { requireAuth, requireRole } = require("../middleware/auth")
const { resolveTargetPatientId } = require("../services/profileService")

const router = express.Router()

function shapedReminder(doc) {
  return { id: String(doc._id), title: doc.title, time: doc.timeLabel, kind: doc.kind }
}

// GET /api/reminders?patientId=
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const targetId = await resolveTargetPatientId(req.user, req.query.patientId)
    const rows = await Reminder.find({ userId: targetId }).sort({ sortOrder: 1 })
    res.json({ reminders: rows.map(shapedReminder) })
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
    const doc = await Reminder.create({
      userId: req.user.id,
      title: title.trim(),
      timeLabel: time.trim(),
      kind: kind.trim(),
      sortOrder: count,
    })

    res.status(201).json(shapedReminder(doc))
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
