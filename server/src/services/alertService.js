const GameResult = require("../models/GameResult")
const Activity = require("../models/Activity")
const ActivityCompletion = require("../models/ActivityCompletion")
const WellnessLog = require("../models/WellnessLog")
const CaregiverAlert = require("../models/CaregiverAlert")
const { todayKey } = require("../utils/dates")

// Evaluates the patient's actual recent data and inserts real alerts when it
// finds something worth flagging - called every time a caregiver loads
// their overview, so alerts stay fresh without needing a cron job.

async function alreadyRaisedToday(patientId, title) {
  const startOfDay = new Date(`${todayKey()}T00:00:00.000Z`)
  return CaregiverAlert.exists({ patientId, title, dismissed: false, createdAt: { $gte: startOfDay } })
}

async function insertAlert(patientId, tone, title, detail) {
  if (await alreadyRaisedToday(patientId, title)) return
  await CaregiverAlert.create({ patientId, tone, title, detail, dismissed: false })
}

/** Flags a downward trend if the last 3 sessions score notably lower than the 3 before that. */
async function checkScoreDrop(patientId) {
  const recent = await GameResult.find({ userId: patientId })
    .sort({ playedAt: -1 })
    .limit(6)
    .select("score")
    .lean()
  if (recent.length < 6) return

  const lastThree = recent.slice(0, 3).reduce((sum, r) => sum + r.score, 0) / 3
  const priorThree = recent.slice(3, 6).reduce((sum, r) => sum + r.score, 0) / 3
  if (priorThree === 0) return

  const dropPct = Math.round(((priorThree - lastThree) / priorThree) * 100)
  if (dropPct >= 15) {
    await insertAlert(
      patientId,
      "warning",
      "Recent scores are trending down",
      `Average score dropped about ${dropPct}% over the last 3 sessions compared to the 3 before. Worth checking in.`,
    )
  }
}

/** Flags activities that are still not done well past when they were scheduled. */
async function checkMissedActivities(patientId) {
  const today = todayKey()
  const activities = await Activity.find({ userId: patientId }).lean()
  if (activities.length === 0) return

  const completions = await ActivityCompletion.find({ userId: patientId, date: today }).lean()
  const doneIds = new Set(completions.filter((c) => c.done).map((c) => String(c.activityId)))

  const currentHour = new Date().getUTCHours()
  const missed = activities.filter((a) => {
    if (doneIds.has(String(a._id))) return false
    const hourMatch = a.timeLabel.match(/(\d{1,2}):?\d{0,2}\s*(AM|PM)/i)
    if (!hourMatch) return false
    let hour = parseInt(hourMatch[1], 10)
    if (/PM/i.test(hourMatch[2]) && hour !== 12) hour += 12
    if (/AM/i.test(hourMatch[2]) && hour === 12) hour = 0
    return currentHour > hour + 2
  })

  if (missed.length > 0) {
    await insertAlert(
      patientId,
      "warning",
      missed.length === 1 ? `Missed: ${missed[0].title}` : `${missed.length} activities missed today`,
      missed.length === 1
        ? `${missed[0].title} was scheduled for ${missed[0].timeLabel} and hasn't been marked done.`
        : `${missed.map((m) => m.title).join(", ")} were not completed at their scheduled times today.`,
    )
  }
}

/** Flags unusually low sleep or water intake logged for today. */
async function checkWellnessDip(patientId) {
  const today = todayKey()
  const log = await WellnessLog.findOne({ userId: patientId, date: today }).lean()
  if (!log) return

  if (log.sleepHours > 0 && log.sleepHours < 5) {
    await insertAlert(
      patientId,
      "info",
      "Low sleep logged today",
      `Only ${log.sleepHours} hours of sleep recorded today, which is below their usual range.`,
    )
  }
  if (log.waterGlasses === 0 && new Date().getUTCHours() >= 14) {
    await insertAlert(
      patientId,
      "info",
      "No water logged yet today",
      "It's afternoon and no water intake has been recorded today.",
    )
  }
}

/** Celebrates a positive streak - alerts aren't only for problems. */
async function checkStreakMilestone(patientId) {
  const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
  const distinctDays = await ActivityCompletion.distinct("date", {
    userId: patientId,
    done: true,
    date: { $gte: sevenDaysAgo.toISOString().slice(0, 10) },
  })
  if (distinctDays.length === 7) {
    await insertAlert(
      patientId,
      "success",
      "Full week completed!",
      "Every day this week had at least one completed activity - great consistency.",
    )
  }
}

/** Run all checks for a patient. Safe to call often - every check dedupes per day. */
async function evaluateAlertsForPatient(patientId) {
  try {
    await checkScoreDrop(patientId)
    await checkMissedActivities(patientId)
    await checkWellnessDip(patientId)
    await checkStreakMilestone(patientId)
  } catch (err) {
    console.error("[alertService] evaluation failed:", err.message)
  }
}

module.exports = { evaluateAlertsForPatient }
