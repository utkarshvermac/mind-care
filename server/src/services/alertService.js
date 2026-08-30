const crypto = require("crypto")
const db = require("../db")

// This was the biggest gap in the original build: alerts only ever showed
// whatever the seed script inserted. This module evaluates the patient's
// actual recent data and inserts real alerts when it finds something worth
// flagging — called every time a caregiver loads their overview, so alerts
// stay fresh without needing a cron job or background worker.

const todayStr = () => new Date().toISOString().slice(0, 10)

/** Avoid inserting the same alert twice today. */
function alreadyRaisedToday(patientId, title) {
  return db
    .prepare(
      `SELECT 1 FROM caregiver_alerts
       WHERE patient_id = ? AND title = ? AND dismissed = 0 AND date(created_at) = date('now')`,
    )
    .get(patientId, title)
}

function insertAlert(patientId, tone, title, detail) {
  if (alreadyRaisedToday(patientId, title)) return
  db.prepare(
    `INSERT INTO caregiver_alerts (id, patient_id, tone, title, detail, created_at, dismissed)
     VALUES (?, ?, ?, ?, ?, datetime('now'), 0)`,
  ).run(crypto.randomUUID(), patientId, tone, title, detail)
}

/** Flags a downward trend if the last 3 sessions score notably lower than the 3 before that. */
function checkScoreDrop(patientId) {
  const recent = db
    .prepare(`SELECT score FROM game_results WHERE user_id = ? ORDER BY played_at DESC LIMIT 6`)
    .all(patientId)
  if (recent.length < 6) return

  const lastThree = recent.slice(0, 3).reduce((sum, r) => sum + r.score, 0) / 3
  const priorThree = recent.slice(3, 6).reduce((sum, r) => sum + r.score, 0) / 3
  if (priorThree === 0) return

  const dropPct = Math.round(((priorThree - lastThree) / priorThree) * 100)
  if (dropPct >= 15) {
    insertAlert(
      patientId,
      "warning",
      "Recent scores are trending down",
      `Average score dropped about ${dropPct}% over the last 3 sessions compared to the 3 before. Worth checking in.`,
    )
  }
}

/** Flags activities that are still not done well past when they were scheduled. */
function checkMissedActivities(patientId) {
  const today = todayStr()
  const activities = db.prepare(`SELECT id, title, time_label FROM activities WHERE user_id = ?`).all(patientId)
  if (activities.length === 0) return

  const completions = db
    .prepare(`SELECT activity_id, done FROM activity_completions WHERE user_id = ? AND date = ?`)
    .all(patientId, today)
  const doneIds = new Set(completions.filter((c) => c.done).map((c) => c.activity_id))

  const currentHour = new Date().getHours()
  const missed = activities.filter((a) => {
    if (doneIds.has(a.id)) return false
    const hourMatch = a.time_label.match(/(\d{1,2}):?\d{0,2}\s*(AM|PM)/i)
    if (!hourMatch) return false
    let hour = parseInt(hourMatch[1], 10)
    if (/PM/i.test(hourMatch[2]) && hour !== 12) hour += 12
    if (/AM/i.test(hourMatch[2]) && hour === 12) hour = 0
    return currentHour > hour + 2 // more than 2 hours past schedule
  })

  if (missed.length > 0) {
    insertAlert(
      patientId,
      "warning",
      missed.length === 1 ? `Missed: ${missed[0].title}` : `${missed.length} activities missed today`,
      missed.length === 1
        ? `${missed[0].title} was scheduled for ${missed[0].time_label} and hasn't been marked done.`
        : `${missed.map((m) => m.title).join(", ")} were not completed at their scheduled times today.`,
    )
  }
}

/** Flags unusually low sleep or water intake logged for today. */
function checkWellnessDip(patientId) {
  const today = todayStr()
  const log = db.prepare(`SELECT * FROM wellness_logs WHERE user_id = ? AND date = ?`).get(patientId, today)
  if (!log) return

  if (log.sleep_hours > 0 && log.sleep_hours < 5) {
    insertAlert(
      patientId,
      "info",
      "Low sleep logged today",
      `Only ${log.sleep_hours} hours of sleep recorded today, which is below their usual range.`,
    )
  }
  if (log.water_glasses === 0 && new Date().getHours() >= 14) {
    insertAlert(
      patientId,
      "info",
      "No water logged yet today",
      "It's afternoon and no water intake has been recorded today.",
    )
  }
}

/** Celebrates a positive streak — alerts aren't only for problems. */
function checkStreakMilestone(patientId) {
  const row = db
    .prepare(
      `SELECT COUNT(DISTINCT date) as days FROM activity_completions
       WHERE user_id = ? AND done = 1 AND date >= date('now', '-6 days')`,
    )
    .get(patientId)
  if (row?.days === 7) {
    insertAlert(
      patientId,
      "success",
      "Full week completed!",
      "Every day this week had at least one completed activity — great consistency.",
    )
  }
}

/** Run all checks for a patient. Safe to call often — every check dedupes per day. */
function evaluateAlertsForPatient(patientId) {
  try {
    checkScoreDrop(patientId)
    checkMissedActivities(patientId)
    checkWellnessDip(patientId)
    checkStreakMilestone(patientId)
  } catch (err) {
    // Alert generation should never break the dashboard if something here fails.
    console.error("[alertService] evaluation failed:", err.message)
  }
}

module.exports = { evaluateAlertsForPatient }
