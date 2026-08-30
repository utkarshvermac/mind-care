// Populates the database with a demo patient (Rahul Sharma) and a demo
// caregiver (Anjali Sharma), linked together, with realistic historical
// game sessions, activity completions, wellness logs, and caregiver alerts
// so the app has something meaningful to show on first run.
//
// Usage:
//   npm run seed          # seed only if the demo accounts don't exist yet
//   npm run seed -- --reset   # wipe all data first, then seed fresh

const crypto = require("crypto")
const db = require("./index")
const { createUser, findByEmail, seedDefaultActivitiesAndReminders } = require("../services/userService")
const { todayKey, dateKeyDaysAgo } = require("../utils/dates")

const PATIENT_EMAIL = "rahul.sharma@mindcare.demo"
const CAREGIVER_EMAIL = "anjali.sharma@mindcare.demo"
const DEMO_PASSWORD = "mindcare"

// Small seeded PRNG so re-running with --reset gives consistent-ish demo data.
function mulberry32(seed) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20260827)

function maybeReset() {
  const shouldReset = process.argv.includes("--reset")
  if (!shouldReset) return
  console.log("Resetting database (--reset flag detected)...")
  const tables = [
    "chat_messages",
    "caregiver_alerts",
    "wellness_logs",
    "reminders",
    "activity_completions",
    "activities",
    "game_results",
    "care_links",
    "preferences",
    "patient_profiles",
    "caregiver_profiles",
    "users",
  ]
  const txn = db.transaction(() => {
    tables.forEach((t) => db.prepare(`DELETE FROM ${t}`).run())
  })
  txn()
}

function seedGameResults(patientId) {
  const insert = db.prepare(
    "INSERT INTO game_results (id, user_id, game, score, accuracy, duration_seconds, played_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  )

  const gameWeights = [
    { game: "card-match", accuracyRange: [85, 98], scoreRange: [650, 950], durationRange: [180, 300] },
    { game: "pattern-recall", accuracyRange: [68, 92], scoreRange: [400, 780], durationRange: [120, 220] },
    { game: "word-recall", accuracyRange: [72, 95], scoreRange: [420, 820], durationRange: [90, 200] },
  ]

  let count = 0
  const txn = db.transaction(() => {
    // Last 7 days: guarantee at least one session every day (real 7-day streak).
    for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
      const sessionsToday = daysAgo === 0 ? 2 : 1 + Math.floor(rand() * 2) // 1-2 sessions/day
      for (let s = 0; s < sessionsToday; s++) {
        const pick = gameWeights[Math.floor(rand() * gameWeights.length)]
        placeSession(pick, daysAgo)
        count++
      }
    }

    // Weeks 2-12 (days 7-83 ago): sprinkle sessions so the streak calendar
    // and 12-week history look lived-in without a session every single day.
    for (let daysAgo = 7; daysAgo < 84; daysAgo++) {
      if (rand() < 0.55) {
        const sessionsToday = rand() < 0.2 ? 2 : 1
        for (let s = 0; s < sessionsToday; s++) {
          const pick = gameWeights[Math.floor(rand() * gameWeights.length)]
          placeSession(pick, daysAgo)
          count++
        }
      }
    }
  })

  function placeSession(pick, daysAgo) {
    const id = `${pick.game}-${Date.now()}-${Math.floor(rand() * 1e6)}`
    const accuracy = Math.round(pick.accuracyRange[0] + rand() * (pick.accuracyRange[1] - pick.accuracyRange[0]))
    const score = Math.round(pick.scoreRange[0] + rand() * (pick.scoreRange[1] - pick.scoreRange[0]))
    const duration = Math.round(pick.durationRange[0] + rand() * (pick.durationRange[1] - pick.durationRange[0]))

    // Spread the timestamp somewhere during that UTC day.
    const dayStartMs = Date.parse(`${dateKeyDaysAgo(daysAgo)}T00:00:00.000Z`)
    const offsetMs = Math.floor(rand() * 20 * 60 * 60 * 1000) // within a 20h window
    const playedAt = new Date(dayStartMs + offsetMs).toISOString()

    insert.run(id, patientId, pick.game, score, Math.min(98, accuracy), duration, playedAt)
  }

  txn()
  return count
}

function seedActivitiesAndCompletions(patientId) {
  const items = [
    { title: "Morning memory warm-up", timeLabel: "8:30 AM" },
    { title: "Card Match session", timeLabel: "11:00 AM" },
    { title: "Short walk with Anjali", timeLabel: "4:00 PM" },
    { title: "Word Recall session", timeLabel: "6:00 PM" },
    { title: "Evening breathing exercise", timeLabel: "8:30 PM" },
  ]

  const insertActivity = db.prepare(
    "INSERT INTO activities (id, user_id, title, time_label, sort_order) VALUES (?, ?, ?, ?, ?)",
  )
  const ids = items.map((item, i) => {
    const id = crypto.randomUUID()
    insertActivity.run(id, patientId, item.title, item.timeLabel, i)
    return id
  })

  const insertCompletion = db.prepare(
    "INSERT INTO activity_completions (id, activity_id, user_id, date, done) VALUES (?, ?, ?, ?, ?)",
  )

  // Today: matches the frontend mock exactly — first four done, last one not yet.
  const todayDone = [true, true, true, true, false]
  ids.forEach((activityId, i) => {
    insertCompletion.run(crypto.randomUUID(), activityId, patientId, todayKey(), todayDone[i] ? 1 : 0)
  })

  // Previous 13 days: high adherence (skews true) so the streak looks real.
  for (let daysAgo = 1; daysAgo < 14; daysAgo++) {
    const date = dateKeyDaysAgo(daysAgo)
    ids.forEach((activityId) => {
      const done = rand() < 0.8
      insertCompletion.run(crypto.randomUUID(), activityId, patientId, date, done ? 1 : 0)
    })
  }
}

function seedReminders(patientId) {
  const items = [
    { title: "Take evening medicine", timeLabel: "8:00 PM", kind: "Medicine" },
    { title: "Call Anjali", timeLabel: "6:30 PM", kind: "Family" },
    { title: "Drink a glass of water", timeLabel: "Every 2 hours", kind: "Wellness" },
  ]
  const insert = db.prepare(
    "INSERT INTO reminders (id, user_id, title, time_label, kind, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
  )
  items.forEach((item, i) => insert.run(crypto.randomUUID(), patientId, item.title, item.timeLabel, item.kind, i))
}

function seedWellnessToday(patientId) {
  const id = crypto.randomUUID()
  db.prepare(
    `INSERT INTO wellness_logs (id, user_id, date, mood, sleep_hours, water_glasses, water_goal, steps, step_goal)
     VALUES (?, ?, ?, 'Good', 7.5, 5, 8, 2400, 4000)`,
  ).run(id, patientId, todayKey())
}

function seedAlerts(patientId) {
  const items = [
    {
      tone: "warning",
      title: "Activity level decreased this week",
      detail: "Rahul completed fewer activities than last week, mostly in the evenings.",
    },
    {
      tone: "info",
      title: "Encourage a short cognitive activity today",
      detail: "Pattern Recall accuracy dipped recently. A 4 minute session would help.",
    },
    {
      tone: "success",
      title: "7 day streak reached",
      detail: "Consistency is the strongest signal in the last 30 days. Keep it going.",
    },
  ]
  const insert = db.prepare(
    "INSERT INTO caregiver_alerts (id, patient_id, tone, title, detail) VALUES (?, ?, ?, ?, ?)",
  )
  items.forEach((item) => insert.run(crypto.randomUUID(), patientId, item.tone, item.title, item.detail))
}

function run() {
  maybeReset()

  const existingPatient = findByEmail(PATIENT_EMAIL)
  if (existingPatient) {
    console.log(`Demo patient (${PATIENT_EMAIL}) already exists — skipping seed.`)
    console.log("Run `npm run seed -- --reset` to wipe and reseed everything.")
    return
  }

  console.log("Creating demo patient and caregiver accounts...")

  const { user: patient } = createUser({
    name: "Rahul Sharma",
    email: PATIENT_EMAIL,
    password: DEMO_PASSWORD,
    role: "patient",
  })
  const { user: caregiver } = createUser({
    name: "Anjali Sharma",
    email: CAREGIVER_EMAIL,
    password: DEMO_PASSWORD,
    role: "caregiver",
  })

  // createUser() already seeded generic starter activities/reminders for the
  // patient — clear those so we can install the exact demo set instead.
  db.prepare("DELETE FROM activities WHERE user_id = ?").run(patient.id)
  db.prepare("DELETE FROM reminders WHERE user_id = ?").run(patient.id)

  db.prepare(
    "UPDATE patient_profiles SET age = 67, condition = ?, care_since = '2025-03-01', cognitive_score_base = 78 WHERE user_id = ?",
  ).run("Memory & cognitive care plan", patient.id)

  db.prepare("UPDATE caregiver_profiles SET relation = ? WHERE user_id = ?").run(
    "Daughter · Primary caregiver",
    caregiver.id,
  )

  db.prepare("INSERT INTO care_links (id, caregiver_id, patient_id) VALUES (?, ?, ?)").run(
    crypto.randomUUID(),
    caregiver.id,
    patient.id,
  )

  seedActivitiesAndCompletions(patient.id)
  seedReminders(patient.id)
  seedWellnessToday(patient.id)
  seedAlerts(patient.id)
  const sessionCount = seedGameResults(patient.id)

  console.log(`Seeded ${sessionCount} historical game sessions.`)
  console.log("")
  console.log("Demo accounts ready:")
  console.log(`  Patient   ${PATIENT_EMAIL} / ${DEMO_PASSWORD}`)
  console.log(`  Caregiver ${CAREGIVER_EMAIL} / ${DEMO_PASSWORD}`)
}

run()
