const express = require("express")
const FamilyMember = require("../models/FamilyMember")
const asyncHandler = require("../utils/asyncHandler")
const { assert, ApiError } = require("../utils/ApiError")
const { requireAuth, requireRole } = require("../middleware/auth")

const router = express.Router()

function shaped(doc) {
  return {
    id: String(doc._id),
    name: doc.name,
    relation: doc.relation,
    note: doc.note,
    photoDataUrl: doc.photoDataUrl,
  }
}

// GET /api/family — the signed-in patient's family & faces book.
// Used both by the management screen and by the Face & Name Recall game.
router.get(
  "/",
  requireAuth,
  requireRole("patient"),
  asyncHandler(async (req, res) => {
    const rows = await FamilyMember.find({ userId: req.user.id }).sort({ sortOrder: 1 })
    res.json({ members: rows.map(shaped) })
  }),
)

// POST /api/family   { name, relation, note?, photoDataUrl? }
router.post(
  "/",
  requireAuth,
  requireRole("patient"),
  asyncHandler(async (req, res) => {
    const { name, relation, note, photoDataUrl } = req.body || {}
    assert(typeof name === "string" && name.trim(), 400, "name is required.")
    assert(typeof relation === "string" && relation.trim(), 400, "relation is required.")
    if (photoDataUrl) {
      assert(typeof photoDataUrl === "string" && photoDataUrl.startsWith("data:image/"), 400, "photoDataUrl must be an image data URL.")
      assert(photoDataUrl.length < 4_000_000, 400, "Photo is too large — please use a smaller image.")
    }

    const count = await FamilyMember.countDocuments({ userId: req.user.id })
    const doc = await FamilyMember.create({
      userId: req.user.id,
      name: name.trim(),
      relation: relation.trim(),
      note: typeof note === "string" ? note.trim() : "",
      photoDataUrl: photoDataUrl || null,
      sortOrder: count,
    })

    res.status(201).json(shaped(doc))
  }),
)

// DELETE /api/family/:id
router.delete(
  "/:id",
  requireAuth,
  requireRole("patient"),
  asyncHandler(async (req, res) => {
    const result = await FamilyMember.deleteOne({ _id: req.params.id, userId: req.user.id })
    if (result.deletedCount === 0) throw new ApiError(404, "Family member not found.")
    res.status(204).end()
  }),
)

module.exports = router
