const express = require("express")
const asyncHandler = require("../utils/asyncHandler")
const { requireAuth } = require("../middleware/auth")
const { resolveTargetPatientId } = require("../services/profileService")
const { getAnalytics } = require("../services/analyticsService")

const router = express.Router()

// GET /api/analytics?patientId=&days=
// Mirrors `getAnalytics()` in lib/api.ts, computed from real stored results.
// `days` controls the trend chart's window (7/30/90); anything else falls
// back to 7 inside getAnalytics itself.
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const targetId = await resolveTargetPatientId(req.user, req.query.patientId)
    const days = parseInt(req.query.days, 10)
    res.json(await getAnalytics(targetId, days))
  }),
)

module.exports = router
