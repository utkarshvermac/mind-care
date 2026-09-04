const express = require("express")
const asyncHandler = require("../utils/asyncHandler")
const { requireAuth } = require("../middleware/auth")
const { resolveTargetPatientId } = require("../services/profileService")
const { getAnalytics } = require("../services/analyticsService")

const router = express.Router()

// GET /api/analytics?patientId=
// Mirrors `getAnalytics()` in lib/api.ts, computed from real stored results.
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const targetId = await resolveTargetPatientId(req.user, req.query.patientId)
    res.json(await getAnalytics(targetId))
  }),
)

module.exports = router
