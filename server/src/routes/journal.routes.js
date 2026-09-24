const express = require("express")
const JournalEntry = require("../models/JournalEntry")
const asyncHandler = require("../utils/asyncHandler")
const { assert, ApiError } = require("../utils/ApiError")
const { requireAuth, requireRole } = require("../middleware/auth")

const router = express.Router()

function shaped(doc) {
  return {
    id: String(doc._id),
    title: doc.title,
    text: doc.text,
    audioDataUrl: doc.audioDataUrl,
    createdAt: doc.createdAt.toISOString(),
  }
}

// GET /api/journal — the patient's life-story / legacy journal, newest first.
router.get(
  "/",
  requireAuth,
  requireRole("patient"),
  asyncHandler(async (req, res) => {
    const rows = await JournalEntry.find({ userId: req.user.id }).sort({ createdAt: -1 })
    res.json({ entries: rows.map(shaped) })
  }),
)

// POST /api/journal   { title, text?, audioDataUrl? }
router.post(
  "/",
  requireAuth,
  requireRole("patient"),
  asyncHandler(async (req, res) => {
    const { title, text, audioDataUrl } = req.body || {}
    assert(typeof title === "string" && title.trim(), 400, "title is required.")
    if (audioDataUrl) {
      assert(typeof audioDataUrl === "string" && audioDataUrl.startsWith("data:audio/"), 400, "audioDataUrl must be an audio data URL.")
      assert(audioDataUrl.length < 6_000_000, 400, "Recording is too long — please keep it under about a minute.")
    }

    const doc = await JournalEntry.create({
      userId: req.user.id,
      title: title.trim(),
      text: typeof text === "string" ? text.trim() : "",
      audioDataUrl: audioDataUrl || null,
    })

    res.status(201).json(shaped(doc))
  }),
)

// DELETE /api/journal/:id
router.delete(
  "/:id",
  requireAuth,
  requireRole("patient"),
  asyncHandler(async (req, res) => {
    const result = await JournalEntry.deleteOne({ _id: req.params.id, userId: req.user.id })
    if (result.deletedCount === 0) throw new ApiError(404, "Journal entry not found.")
    res.status(204).end()
  }),
)

module.exports = router
