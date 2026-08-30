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

// GET /api/caregivers/me/overview
// Mirrors `getCaregiverData()` in lib/api.ts: { profile, patient, alerts }
router.get(
  "/me/overview",
  requireAuth,
  requireRole("caregiver"),
  asyncHandler(async (req, res) => {
    const patient = findLinkedPatient(req.user.id)
    assert(patient, 404, "No patient is linked to your caregiver account yet.")

    evaluateAlertsForPatient(patient.id)

    res.json({
      profile: getCaregiverProfile(req.user.id),
      patient: getPatientProfile(patient.id),
      alerts: activeAlertsFor(patient.id),
    })
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
