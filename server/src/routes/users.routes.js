const express = require("express")
const User = require("../models/User")
const Preferences = require("../models/Preferences")
const asyncHandler = require("../utils/asyncHandler")
const { assert } = require("../utils/ApiError")
const { requireAuth } = require("../middleware/auth")
const { initialsOf } = require("../services/userService")
const { getPatientProfile, getCaregiverProfile } = require("../services/profileService")

const router = express.Router()

const SUPPORTED_LANGUAGES = ["en", "hi", "as", "brx", "kha", "lus", "mni"]
// English, Hindi, Assamese, Bodo, Khasi, Mizo, Manipuri (Meitei)

async function shapedProfile(user) {
  return user.role === "patient" ? getPatientProfile(user.id) : getCaregiverProfile(user.id)
}

function shapedPreferences(doc) {
  return {
    theme: doc.theme,
    elderMode: doc.elderMode,
    fontScale: doc.fontScale,
    reduceMotion: doc.reduceMotion,
    notifications: doc.notifications,
    sound: doc.sound,
    language: doc.language,
    shareWithCaregiver: doc.shareWithCaregiver,
  }
}

// GET /api/users/me
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ role: req.user.role, user: await shapedProfile(req.user) })
  }),
)

// PATCH /api/users/me   { name }
router.patch(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { name } = req.body || {}
    assert(typeof name === "string" && name.trim().length > 0, 400, "Name cannot be empty.")

    await User.updateOne({ _id: req.user.id }, { name: name.trim(), initials: initialsOf(name) })
    const updated = await User.findById(req.user.id).lean()
    updated.id = updated._id
    res.json({ role: updated.role, user: await shapedProfile(updated) })
  }),
)

// GET /api/users/me/preferences
router.get(
  "/me/preferences",
  requireAuth,
  asyncHandler(async (req, res) => {
    let doc = await Preferences.findById(req.user.id)
    if (!doc) doc = await Preferences.create({ _id: req.user.id })
    res.json(shapedPreferences(doc))
  }),
)

// PATCH /api/users/me/preferences
// { theme?, elderMode?, fontScale?, reduceMotion?, notifications?, sound?, language?, shareWithCaregiver? }
router.patch(
  "/me/preferences",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = req.body || {}
    let current = await Preferences.findById(req.user.id)
    if (!current) current = await Preferences.create({ _id: req.user.id })

    if (body.theme === "dark" || body.theme === "light") current.theme = body.theme
    if (typeof body.elderMode === "boolean") current.elderMode = body.elderMode
    if (["normal", "large", "xlarge"].includes(body.fontScale)) current.fontScale = body.fontScale
    if (typeof body.reduceMotion === "boolean") current.reduceMotion = body.reduceMotion
    if (typeof body.notifications === "boolean") current.notifications = body.notifications
    if (typeof body.sound === "boolean") current.sound = body.sound
    if (SUPPORTED_LANGUAGES.includes(body.language)) current.language = body.language
    if (typeof body.shareWithCaregiver === "boolean") current.shareWithCaregiver = body.shareWithCaregiver

    await current.save()
    res.json(shapedPreferences(current))
  }),
)

module.exports = router
