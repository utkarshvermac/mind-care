const express = require("express")
const asyncHandler = require("../utils/asyncHandler")
const { requireAuth } = require("../middleware/auth")
const { resolveTargetPatientId } = require("../services/profileService")
const { getAchievements } = require("../services/achievementsService")

const router = express.Router()

// GET /api/achievements?patientId=
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const targetId = resolveTargetPatientId(req.user, req.query.patientId)
    res.json({ achievements: getAchievements(targetId) })
  }),
)

module.exports = router
