const express = require("express")
const crypto = require("crypto")
const db = require("../db")
const asyncHandler = require("../utils/asyncHandler")
const { assert, ApiError } = require("../utils/ApiError")
const { requireAuth, requireRole } = require("../middleware/auth")
const { resolveTargetPatientId } = require("../services/profileService")

const router = express.Router()

function shapedReminder(row) {
  return { id: row.id, title: row.title, time: row.time_label, kind: row.kind }
}

// GET /api/reminders?patientId=
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const targetId = resolveTargetPatientId(req.user, req.query.patientId)
    const rows = db.prepare("SELECT * FROM reminders WHERE user_id = ? ORDER BY sort_order ASC").all(targetId)
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

    const countRow = db.prepare("SELECT COUNT(*) AS n FROM reminders WHERE user_id = ?").get(req.user.id)
    const id = crypto.randomUUID()
    db.prepare(
      "INSERT INTO reminders (id, user_id, title, time_label, kind, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(id, req.user.id, title.trim(), time.trim(), kind.trim(), countRow.n)

    res.status(201).json(shapedReminder(db.prepare("SELECT * FROM reminders WHERE id = ?").get(id)))
  }),
)

// DELETE /api/reminders/:id
router.delete(
  "/:id",
  requireAuth,
  requireRole("patient"),
  asyncHandler(async (req, res) => {
    const result = db.prepare("DELETE FROM reminders WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id)
    if (result.changes === 0) throw new ApiError(404, "Reminder not found.")
    res.status(204).end()
  }),
)

module.exports = router
