const express = require("express")
const PatientProfile = require("../models/PatientProfile")
const CaregiverAlert = require("../models/CaregiverAlert")
const asyncHandler = require("../utils/asyncHandler")
const { assert, ApiError } = require("../utils/ApiError")
const { requireAuth, requireRole } = require("../middleware/auth")
const { getPatientProfile, getRecentActivity } = require("../services/profileService")
const { getInviteCode } = require("../services/userService")

const router = express.Router()

async function getOrCreateProfile(userId) {
  let profile = await PatientProfile.findById(userId)
  if (!profile) profile = await PatientProfile.create({ _id: userId, careSince: new Date().toISOString().slice(0, 10) })
  return profile
}

// GET /api/patients/me
// Mirrors `getPatientData()` in lib/api.ts: { profile, activity }
router.get(
  "/me",
  requireAuth,
  requireRole("patient"),
  asyncHandler(async (req, res) => {
    res.json({
      profile: await getPatientProfile(req.user.id),
      activity: await getRecentActivity(req.user.id, 3),
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
    res.json({ inviteCode: await getInviteCode(req.user.id) })
  }),
)

/* --------------------------- Safety: emergency contacts --------------------------- */

// GET /api/patients/me/emergency-contacts
router.get(
  "/me/emergency-contacts",
  requireAuth,
  requireRole("patient"),
  asyncHandler(async (req, res) => {
    const profile = await getOrCreateProfile(req.user.id)
    res.json({ contacts: profile.emergencyContacts })
  }),
)

// POST /api/patients/me/emergency-contacts   { name, phone, relation? }
router.post(
  "/me/emergency-contacts",
  requireAuth,
  requireRole("patient"),
  asyncHandler(async (req, res) => {
    const { name, phone, relation } = req.body || {}
    assert(typeof name === "string" && name.trim(), 400, "name is required.")
    assert(typeof phone === "string" && /^[0-9+\-\s()]{7,20}$/.test(phone.trim()), 400, "Please enter a valid phone number.")

    const profile = await getOrCreateProfile(req.user.id)
    profile.emergencyContacts.push({ name: name.trim(), phone: phone.trim(), relation: (relation || "").trim() })
    await profile.save()
    res.status(201).json({ contacts: profile.emergencyContacts })
  }),
)

// DELETE /api/patients/me/emergency-contacts/:contactId
router.delete(
  "/me/emergency-contacts/:contactId",
  requireAuth,
  requireRole("patient"),
  asyncHandler(async (req, res) => {
    const profile = await getOrCreateProfile(req.user.id)
    const before = profile.emergencyContacts.length
    profile.emergencyContacts = profile.emergencyContacts.filter((c) => String(c._id) !== req.params.contactId)
    if (profile.emergencyContacts.length === before) throw new ApiError(404, "Contact not found.")
    await profile.save()
    res.json({ contacts: profile.emergencyContacts })
  }),
)

/* --------------------------- Safety: location & SOS --------------------------- */

// POST /api/patients/me/location   { lat, lng }
// A single opt-in "share my location now" ping — not continuous tracking.
router.post(
  "/me/location",
  requireAuth,
  requireRole("patient"),
  asyncHandler(async (req, res) => {
    const { lat, lng } = req.body || {}
    assert(typeof lat === "number" && typeof lng === "number", 400, "lat and lng must be numbers.")

    const profile = await getOrCreateProfile(req.user.id)
    profile.lastLocation = { lat, lng, updatedAt: new Date() }
    await profile.save()
    res.json({ lastLocation: profile.lastLocation })
  }),
)

// POST /api/patients/me/sos   { note? }
// Raises an urgent alert for every linked caregiver immediately — this
// bypasses the normal once-a-day alert dedupe since an SOS should never be
// silently swallowed.
router.post(
  "/me/sos",
  requireAuth,
  requireRole("patient"),
  asyncHandler(async (req, res) => {
    const profile = await getOrCreateProfile(req.user.id)
    const note = typeof req.body?.note === "string" ? req.body.note.trim() : ""
    const locationNote = profile.lastLocation
      ? ` Last shared location: https://www.google.com/maps?q=${profile.lastLocation.lat},${profile.lastLocation.lng}`
      : ""

    await CaregiverAlert.create({
      patientId: req.user.id,
      tone: "warning",
      title: "SOS alert triggered",
      detail: `An SOS was triggered at ${new Date().toLocaleString()}.${note ? ` Note: ${note}.` : ""}${locationNote}`,
      dismissed: false,
    })

    res.status(201).json({ ok: true })
  }),
)

module.exports = router
