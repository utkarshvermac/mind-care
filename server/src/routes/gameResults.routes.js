const express = require("express")
const crypto = require("crypto")
const db = require("../db")
const asyncHandler = require("../utils/asyncHandler")
const { assert } = require("../utils/ApiError")
const { requireAuth, requireRole } = require("../middleware/auth")
const { isValidGameId } = require("../data/gamesCatalog")
const { resolveTargetPatientId } = require("../services/profileService")

const router = express.Router()

function shapedResult(row) {
  return {
    id: row.id,
    game: row.game,
    score: row.score,
    accuracy: row.accuracy,
    durationSeconds: row.duration_seconds,
    playedAt: row.played_at,
  }
}

/** Slowly nudge the patient's long-term cognitive-score baseline toward recent accuracy. */
function nudgeCognitiveBaseline(patientId, accuracy) {
  const profile = db.prepare("SELECT * FROM patient_profiles WHERE user_id = ?").get(patientId)
  if (!profile) return
  const nextBase = Math.round(profile.cognitive_score_base * 0.9 + accuracy * 0.1)
  db.prepare("UPDATE patient_profiles SET cognitive_score_base = ? WHERE user_id = ?").run(nextBase, patientId)
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

    const id = `${game}-${Date.now()}`
    const playedAt = new Date().toISOString()

    db.prepare(
      "INSERT INTO game_results (id, user_id, game, score, accuracy, duration_seconds, played_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(id, req.user.id, game, score, accuracy, durationSeconds, playedAt)

    nudgeCognitiveBaseline(req.user.id, accuracy)

    res.status(201).json(shapedResult(db.prepare("SELECT * FROM game_results WHERE id = ?").get(id)))
  }),
)

// GET /api/game-results?limit=20&patientId=  (caregiver may pass patientId)
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const targetId = resolveTargetPatientId(req.user, req.query.patientId)
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 20))

    const rows = db
      .prepare("SELECT * FROM game_results WHERE user_id = ? ORDER BY played_at DESC LIMIT ?")
      .all(targetId, limit)

    res.json({ results: rows.map(shapedResult) })
  }),
)

// GET /api/game-results/personal-best/:game?patientId=
router.get(
  "/personal-best/:game",
  requireAuth,
  asyncHandler(async (req, res) => {
    assert(isValidGameId(req.params.game), 400, "Unknown game id.")
    const targetId = resolveTargetPatientId(req.user, req.query.patientId)

    const row = db
      .prepare("SELECT MAX(score) AS best FROM game_results WHERE user_id = ? AND game = ?")
      .get(targetId, req.params.game)

    res.json({ game: req.params.game, best: row.best || 0 })
  }),
)

module.exports = router
