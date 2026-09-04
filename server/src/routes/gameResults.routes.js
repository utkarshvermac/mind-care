const express = require("express")
const GameResult = require("../models/GameResult")
const PatientProfile = require("../models/PatientProfile")
const asyncHandler = require("../utils/asyncHandler")
const { assert } = require("../utils/ApiError")
const { requireAuth, requireRole } = require("../middleware/auth")
const { isValidGameId } = require("../data/gamesCatalog")
const { resolveTargetPatientId } = require("../services/profileService")

const router = express.Router()

function shapedResult(doc) {
  return {
    id: String(doc._id),
    game: doc.game,
    score: doc.score,
    accuracy: doc.accuracy,
    durationSeconds: doc.durationSeconds,
    playedAt: doc.playedAt.toISOString(),
  }
}

/** Slowly nudge the patient's long-term cognitive-score baseline toward recent accuracy. */
async function nudgeCognitiveBaseline(patientId, accuracy) {
  const profile = await PatientProfile.findById(patientId)
  if (!profile) return
  profile.cognitiveScoreBase = Math.round(profile.cognitiveScoreBase * 0.9 + accuracy * 0.1)
  await profile.save()
}

// POST /api/game-results   { game, score, accuracy, durationSeconds }
// Mirrors `saveGameResult()` in lib/api.ts
router.post(
  "/",
  requireAuth,
  requireRole("patient"),
  asyncHandler(async (req, res) => {
    const { game, score, accuracy, durationSeconds } = req.body || {}

    assert(isValidGameId(game), 400, "Unknown game id.")
    assert(Number.isInteger(score) && score >= 0, 400, "score must be a non-negative integer.")
    assert(Number.isInteger(accuracy) && accuracy >= 0 && accuracy <= 100, 400, "accuracy must be 0-100.")
    assert(
      Number.isInteger(durationSeconds) && durationSeconds >= 0,
      400,
      "durationSeconds must be a non-negative integer.",
    )

    const doc = await GameResult.create({
      userId: req.user.id,
      game,
      score,
      accuracy,
      durationSeconds,
      playedAt: new Date(),
    })

    await nudgeCognitiveBaseline(req.user.id, accuracy)

    res.status(201).json(shapedResult(doc))
  }),
)

// GET /api/game-results?limit=20&patientId=  (caregiver may pass patientId)
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const targetId = await resolveTargetPatientId(req.user, req.query.patientId)
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 20))

    const rows = await GameResult.find({ userId: targetId }).sort({ playedAt: -1 }).limit(limit)

    res.json({ results: rows.map(shapedResult) })
  }),
)

// GET /api/game-results/personal-best/:game?patientId=
router.get(
  "/personal-best/:game",
  requireAuth,
  asyncHandler(async (req, res) => {
    assert(isValidGameId(req.params.game), 400, "Unknown game id.")
    const targetId = await resolveTargetPatientId(req.user, req.query.patientId)

    const best = await GameResult.find({ userId: targetId, game: req.params.game })
      .sort({ score: -1 })
      .limit(1)
      .select("score")
      .lean()

    res.json({ game: req.params.game, best: best.length ? best[0].score : 0 })
  }),
)

module.exports = router
