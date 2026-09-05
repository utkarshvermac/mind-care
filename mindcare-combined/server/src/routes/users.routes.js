const express = require("express")
const db = require("../db")
const asyncHandler = require("../utils/asyncHandler")
const { assert } = require("../utils/ApiError")
const { requireAuth } = require("../middleware/auth")
const { initialsOf } = require("../services/userService")
const { getPatientProfile, getCaregiverProfile } = require("../services/profileService")

const router = express.Router()

const SUPPORTED_LANGUAGES = ["en", "hi", "as"] // English, Hindi, Assamese

function shapedProfile(user) {
  return user.role === "patient" ? getPatientProfile(user.id) : getCaregiverProfile(user.id)
}

function shapedPreferences(row) {
  return {
    theme: row.theme,
    elderMode: Boolean(row.elder_mode),
    fontScale: row.font_scale,
    reduceMotion: Boolean(row.reduce_motion),
    notifications: Boolean(row.notifications),
    sound: Boolean(row.sound),
    language: row.language,
    shareWithCaregiver: Boolean(row.share_with_caregiver),
  }
}

// GET /api/users/me
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ role: req.user.role, user: shapedProfile(req.user) })
  }),
)

// PATCH /api/users/me   { name }
router.patch(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { name } = req.body || {}
    assert(typeof name === "string" && name.trim().length > 0, 400, "Name cannot be empty.")

    db.prepare("UPDATE users SET name = ?, initials = ? WHERE id = ?").run(
      name.trim(),
      initialsOf(name),
      req.user.id,
    )
    const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id)
    res.json({ role: updated.role, user: shapedProfile(updated) })
  }),
)

// GET /api/users/me/preferences
router.get(
  "/me/preferences",
  requireAuth,
  asyncHandler(async (req, res) => {
    const row = db.prepare("SELECT * FROM preferences WHERE user_id = ?").get(req.user.id)
    res.json(shapedPreferences(row))
  }),
)

// PATCH /api/users/me/preferences
// { theme?, elderMode?, fontScale?, reduceMotion?, notifications?, sound?, language?, shareWithCaregiver? }
router.patch(
  "/me/preferences",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = req.body || {}
    const current = db.prepare("SELECT * FROM preferences WHERE user_id = ?").get(req.user.id)

    const next = {
      theme: body.theme === "dark" || body.theme === "light" ? body.theme : current.theme,
      elder_mode: typeof body.elderMode === "boolean" ? (body.elderMode ? 1 : 0) : current.elder_mode,
      font_scale: ["normal", "large", "xlarge"].includes(body.fontScale) ? body.fontScale : current.font_scale,
      reduce_motion:
        typeof body.reduceMotion === "boolean" ? (body.reduceMotion ? 1 : 0) : current.reduce_motion,
      notifications:
        typeof body.notifications === "boolean" ? (body.notifications ? 1 : 0) : current.notifications,
      sound: typeof body.sound === "boolean" ? (body.sound ? 1 : 0) : current.sound,
      language: SUPPORTED_LANGUAGES.includes(body.language) ? body.language : current.language,
      share_with_caregiver:
        typeof body.shareWithCaregiver === "boolean"
          ? (body.shareWithCaregiver ? 1 : 0)
          : current.share_with_caregiver,
    }

    db.prepare(
      `UPDATE preferences SET theme=?, elder_mode=?, font_scale=?, reduce_motion=?, notifications=?, sound=?,
       language=?, share_with_caregiver=? WHERE user_id = ?`,
    ).run(
      next.theme,
      next.elder_mode,
      next.font_scale,
      next.reduce_motion,
      next.notifications,
      next.sound,
      next.language,
      next.share_with_caregiver,
      req.user.id,
    )

    const updated = db.prepare("SELECT * FROM preferences WHERE user_id = ?").get(req.user.id)
    res.json(shapedPreferences(updated))
  }),
)

module.exports = router
