const express = require("express")
const db = require("../db")
const asyncHandler = require("../utils/asyncHandler")
const { ApiError, assert } = require("../utils/ApiError")
const { requireAuth, requireRole } = require("../middleware/auth")
const {
  getCaregiverProfile,
  getPatientProfile,
  findLinkedPatient,
} = require("../services/profileService")
const { evaluateAlertsForPatient } = require("../services/alertService")
const { linkPatientByInviteCode } = require("../services/userService")

const router = express.Router()

function shapedAlert(row) {
  return {
    id: row.id,
    tone: row.tone,
    title: row.title,
    detail: row.detail,
    createdAt: row.created_at,
    dismissed: Boolean(row.dismissed),
  }
}

function activeAlertsFor(patientId) {
  return db
    .prepare("SELECT * FROM caregiver_alerts WHERE patient_id = ? AND dismissed = 0 ORDER BY created_at DESC")
    .all(patientId)
    .map(shapedAlert)
}

function patientSharesData(patientId) {
  const row = db.prepare("SELECT share_with_caregiver FROM preferences WHERE user_id = ?").get(patientId)
  return row ? Boolean(row.share_with_caregiver) : true
}

// GET /api/caregivers/me/overview
// Mirrors `getCaregiverData()` in lib/api.ts: { profile, patient, alerts, linked }
// Returns linked: false (not a 404) when no patient is linked yet, so the
// frontend can show a proper "link a patient" screen instead of treating
// this as a network error.
router.get(
  "/me/overview",
  requireAuth,
  requireRole("caregiver"),
  asyncHandler(async (req, res) => {
    const profile = getCaregiverProfile(req.user.id)
    const patient = findLinkedPatient(req.user.id)

    if (!patient) {
      return res.json({ profile, patient: null, alerts: [], linked: false })
    }

    if (!patientSharesData(patient.id)) {
      return res.json({
        profile,
        patient: { id: patient.id, name: patient.name, initials: patient.initials, limited: true },
        alerts: [],
        linked: true,
        limited: true,
      })
    }

    evaluateAlertsForPatient(patient.id)

    res.json({
      profile,
      patient: getPatientProfile(patient.id),
      alerts: activeAlertsFor(patient.id),
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

    const result = linkPatientByInviteCode(req.user.id, code.trim())
    if (result.error === "invalid-code") {
      throw new ApiError(404, "That invite code doesn't match any patient account.")
    }
    if (result.error === "already-linked") {
      throw new ApiError(409, "You are already linked to this patient.")
    }

    res.status(201).json({ patient: getPatientProfile(result.patientId) })
  }),
)

// GET /api/caregivers/me/patients — list every patient linked to this caregiver
router.get(
  "/me/patients",
  requireAuth,
  requireRole("caregiver"),
  asyncHandler(async (req, res) => {
    const rows = db
      .prepare(
        `SELECT u.id, u.name, u.initials FROM care_links cl
         JOIN users u ON u.id = cl.patient_id
         WHERE cl.caregiver_id = ?
         ORDER BY cl.created_at ASC`,
      )
      .all(req.user.id)
    res.json({ patients: rows })
  }),
)

// GET /api/caregivers/me/alerts?patientId=
router.get(
  "/me/alerts",
  requireAuth,
  requireRole("caregiver"),
  asyncHandler(async (req, res) => {
    const patientId = req.query.patientId || findLinkedPatient(req.user.id)?.id
    assert(patientId, 404, "No patient is linked to your caregiver account yet.")

    const link = db
      .prepare("SELECT 1 FROM care_links WHERE caregiver_id = ? AND patient_id = ?")
      .get(req.user.id, patientId)
    assert(link, 403, "That patient is not linked to your caregiver account.")

    res.json({ alerts: activeAlertsFor(patientId) })
  }),
)

// PATCH /api/caregivers/me/alerts/:id   { dismissed: true }
router.patch(
  "/me/alerts/:id",
  requireAuth,
  requireRole("caregiver"),
  asyncHandler(async (req, res) => {
    const alert = db.prepare("SELECT * FROM caregiver_alerts WHERE id = ?").get(req.params.id)
    if (!alert) throw new ApiError(404, "Alert not found.")

    const link = db
      .prepare("SELECT 1 FROM care_links WHERE caregiver_id = ? AND patient_id = ?")
      .get(req.user.id, alert.patient_id)
    assert(link, 403, "That alert does not belong to one of your linked patients.")

    const dismissed = req.body?.dismissed !== false
    db.prepare("UPDATE caregiver_alerts SET dismissed = ? WHERE id = ?").run(dismissed ? 1 : 0, alert.id)
    res.json(shapedAlert(db.prepare("SELECT * FROM caregiver_alerts WHERE id = ?").get(alert.id)))
  }),
)

module.exports = router
