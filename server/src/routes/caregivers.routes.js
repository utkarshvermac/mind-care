const express = require("express")
const CaregiverAlert = require("../models/CaregiverAlert")
const Preferences = require("../models/Preferences")
const CareLink = require("../models/CareLink")
const asyncHandler = require("../utils/asyncHandler")
const { ApiError, assert } = require("../utils/ApiError")
const { requireAuth, requireRole } = require("../middleware/auth")
const {
  getCaregiverProfile,
  getPatientProfile,
  findLinkedPatient,
  listLinkedPatients,
} = require("../services/profileService")
const { evaluateAlertsForPatient } = require("../services/alertService")
const { linkPatientByInviteCode } = require("../services/userService")

const router = express.Router()

function shapedAlert(doc) {
  return {
    id: String(doc._id),
    tone: doc.tone,
    title: doc.title,
    detail: doc.detail,
    createdAt: doc.createdAt.toISOString(),
    dismissed: doc.dismissed,
  }
}

async function activeAlertsFor(patientId) {
  const rows = await CaregiverAlert.find({ patientId, dismissed: false }).sort({ createdAt: -1 })
  return rows.map(shapedAlert)
}

async function patientSharesData(patientId) {
  const prefs = await Preferences.findById(patientId).lean()
  return prefs ? prefs.shareWithCaregiver : true
}

// GET /api/caregivers/me/overview?patientId=
// Mirrors `getCaregiverData()` in lib/api.ts: { profile, patient, patients, alerts, linked }
// - `patients` lists every linked patient (id, name, initials) so the
//   frontend can offer a switcher when a caregiver has more than one.
// - Returns linked:false (not a 404) when no patient is linked yet, so the
//   frontend can show a proper "link a patient" screen instead of treating
//   this as a network error.
router.get(
  "/me/overview",
  requireAuth,
  requireRole("caregiver"),
  asyncHandler(async (req, res) => {
    const profile = await getCaregiverProfile(req.user.id)
    const linkedPatients = await listLinkedPatients(req.user.id)
    const patientsSummary = linkedPatients.map((p) => ({ id: p._id, name: p.name, initials: p.initials }))

    if (linkedPatients.length === 0) {
      return res.json({ profile, patient: null, patients: [], alerts: [], linked: false })
    }

    const requestedId = req.query.patientId
    const target = requestedId
      ? linkedPatients.find((p) => p._id === requestedId)
      : linkedPatients[0]

    if (!target) throw new ApiError(403, "That patient is not linked to your caregiver account.")

    if (!(await patientSharesData(target._id))) {
      return res.json({
        profile,
        patient: { id: target._id, name: target.name, initials: target.initials, limited: true },
        patients: patientsSummary,
        alerts: [],
        linked: true,
        limited: true,
      })
    }

    await evaluateAlertsForPatient(target._id)

    res.json({
      profile,
      patient: await getPatientProfile(target._id),
      patients: patientsSummary,
      alerts: await activeAlertsFor(target._id),
      linked: true,
      limited: false,
    })
  }),
)

// POST /api/caregivers/me/link   { code }
router.post(
  "/me/link",
  requireAuth,
  requireRole("caregiver"),
  asyncHandler(async (req, res) => {
    const { code } = req.body || {}
    assert(typeof code === "string" && code.trim().length > 0, 400, "Please enter an invite code.")

    const result = await linkPatientByInviteCode(req.user.id, code.trim())
    if (result.error === "invalid-code") {
      throw new ApiError(404, "That invite code doesn't match any patient account.")
    }
    if (result.error === "already-linked") {
      throw new ApiError(409, "You are already linked to this patient.")
    }

    res.status(201).json({ patient: await getPatientProfile(result.patientId) })
  }),
)

// GET /api/caregivers/me/patients — list every patient linked to this caregiver
router.get(
  "/me/patients",
  requireAuth,
  requireRole("caregiver"),
  asyncHandler(async (req, res) => {
    const patients = await listLinkedPatients(req.user.id)
    res.json({ patients: patients.map((p) => ({ id: p._id, name: p.name, initials: p.initials })) })
  }),
)

// GET /api/caregivers/me/alerts?patientId=
router.get(
  "/me/alerts",
  requireAuth,
  requireRole("caregiver"),
  asyncHandler(async (req, res) => {
    const patientId = req.query.patientId || (await findLinkedPatient(req.user.id))?.id
    assert(patientId, 404, "No patient is linked to your caregiver account yet.")

    const link = await CareLink.exists({ caregiverId: req.user.id, patientId })
    assert(link, 403, "That patient is not linked to your caregiver account.")

    res.json({ alerts: await activeAlertsFor(patientId) })
  }),
)

// PATCH /api/caregivers/me/alerts/:id   { dismissed: true }
router.patch(
  "/me/alerts/:id",
  requireAuth,
  requireRole("caregiver"),
  asyncHandler(async (req, res) => {
    const alert = await CaregiverAlert.findById(req.params.id)
    if (!alert) throw new ApiError(404, "Alert not found.")

    const link = await CareLink.exists({ caregiverId: req.user.id, patientId: alert.patientId })
    assert(link, 403, "That alert does not belong to one of your linked patients.")

    alert.dismissed = req.body?.dismissed !== false
    await alert.save()
    res.json(shapedAlert(alert))
  }),
)

module.exports = router
