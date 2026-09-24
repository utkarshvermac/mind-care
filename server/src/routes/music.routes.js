const express = require("express")
const MusicMemory = require("../models/MusicMemory")
const asyncHandler = require("../utils/asyncHandler")
const { assert, ApiError } = require("../utils/ApiError")
const { requireAuth, requireRole } = require("../middleware/auth")

const router = express.Router()

function shaped(doc) {
  return {
    id: String(doc._id),
    title: doc.title,
    artist: doc.artist,
    note: doc.note,
    link: doc.link,
  }
}

// GET /api/music — the patient's curated "Music Memories" list.
router.get(
  "/",
  requireAuth,
  requireRole("patient"),
  asyncHandler(async (req, res) => {
    const rows = await MusicMemory.find({ userId: req.user.id }).sort({ sortOrder: 1 })
    res.json({ memories: rows.map(shaped) })
  }),
)

// POST /api/music   { title, artist?, note?, link? }
router.post(
  "/",
  requireAuth,
  requireRole("patient"),
  asyncHandler(async (req, res) => {
    const { title, artist, note, link } = req.body || {}
    assert(typeof title === "string" && title.trim(), 400, "title is required.")
    if (link) {
      assert(/^https?:\/\//i.test(link), 400, "link must be a valid http(s) URL.")
    }

    const count = await MusicMemory.countDocuments({ userId: req.user.id })
    const doc = await MusicMemory.create({
      userId: req.user.id,
      title: title.trim(),
      artist: typeof artist === "string" ? artist.trim() : "",
      note: typeof note === "string" ? note.trim() : "",
      link: link || null,
      sortOrder: count,
    })

    res.status(201).json(shaped(doc))
  }),
)

// DELETE /api/music/:id
router.delete(
  "/:id",
  requireAuth,
  requireRole("patient"),
  asyncHandler(async (req, res) => {
    const result = await MusicMemory.deleteOne({ _id: req.params.id, userId: req.user.id })
    if (result.deletedCount === 0) throw new ApiError(404, "Music memory not found.")
    res.status(204).end()
  }),
)

module.exports = router
