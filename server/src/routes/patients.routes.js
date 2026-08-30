const express = require("express")
const asyncHandler = require("../utils/asyncHandler")
const { requireAuth, requireRole } = require("../middleware/auth")
const { getPatientProfile, getRecentActivity } = require("../services/profileService")

const router = express.Router()

// GET /api/patients/me
// Mirrors `getPatientData()` in lib/api.ts: { profile, activity }
router.get(
  "/me",
  requireAuth,
  requireRole("patient"),
  asyncHandler(async (req, res) => {
    res.json({
      profile: getPatientProfile(req.user.id),
      activity: getRecentActivity(req.user.id, 3),
    })
  }),
)

module.exports = router
