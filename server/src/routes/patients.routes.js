const express = require("express")
const asyncHandler = require("../utils/asyncHandler")
const { requireAuth, requireRole } = require("../middleware/auth")
const { getPatientProfile, getRecentActivity } = require("../services/profileService")
const { getInviteCode } = require("../services/userService")

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

// GET /api/patients/me/invite-code
// The code a patient shares with their caregiver so the caregiver's account
// can be linked to see this patient's data.
router.get(
  "/me/invite-code",
  requireAuth,
  requireRole("patient"),
  asyncHandler(async (req, res) => {
    res.json({ inviteCode: getInviteCode(req.user.id) })
  }),
)

module.exports = router
