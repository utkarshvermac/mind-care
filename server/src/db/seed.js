// Populates the database with a demo patient (Rahul Sharma) and a demo
// caregiver (Anjali Sharma), linked together, with realistic historical
// game sessions, activity completions, wellness logs, and caregiver alerts
// so the app has something meaningful to show on first run.
//
// Usage:
//   node src/db/seed.js               # seed only if the demo accounts don't exist yet
//   node src/db/seed.js --reset       # wipe all data first, then seed fresh

const mongoose = require("mongoose")
const { connectDB } = require("./connect")
const User = require("../models/User")
const PatientProfile = require("../models/PatientProfile")
const CaregiverProfile = require("../models/CaregiverProfile")
const CareLink = require("../models/CareLink")
const Preferences = require("../models/Preferences")
const GameResult = require("../models/GameResult")
const Activity = require("../models/Activity")
const ActivityCompletion = require("../models/ActivityCompletion")
const Reminder = require("../models/Reminder")
const WellnessLog = require("../models/WellnessLog")
const CaregiverAlert = require("../models/CaregiverAlert")
const ChatMessage = require("../models/ChatMessage")
const { createUser, findByEmail } = require("../services/userService")
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

async function maybeReset() {
  if (!process.argv.includes("--reset")) return
  console.log("Resetting database (--reset flag detected)...")
  await Promise.all([
    ChatMessage.deleteMany({}),
    CaregiverAlert.deleteMany({}),
    WellnessLog.deleteMany({}),
    Reminder.deleteMany({}),
    ActivityCompletion.deleteMany({}),
    Activity.deleteMany({}),
    GameResult.deleteMany({}),
    CareLink.deleteMany({}),
    Preferences.deleteMany({}),
    PatientProfile.deleteMany({}),
    CaregiverProfile.deleteMany({}),
    User.deleteMany({}),
  ])
}

async function seedGameResults(patientId) {
  const gameWeights = [
    { game: "card-match", accuracyRange: [85, 98], scoreRange: [650, 950], durationRange: [180, 300] },
    { game: "pattern-recall", accuracyRange: [68, 92], scoreRange: [400, 780], durationRange: [120, 220] },
    { game: "word-recall", accuracyRange: [72, 95], scoreRange: [420, 820], durationRange: [90, 200] },
  ]

  const docs = []
  function placeSession(pick, daysAgo) {
    const accuracy = Math.round(pick.accuracyRange[0] + rand() * (pick.accuracyRange[1] - pick.accuracyRange[0]))
    const score = Math.round(pick.scoreRange[0] + rand() * (pick.scoreRange[1] - pick.scoreRange[0]))
    const duration = Math.round(pick.durationRange[0] + rand() * (pick.durationRange[1] - pick.durationRange[0]))
    const dayStartMs = Date.parse(`${dateKeyDaysAgo(daysAgo)}T00:00:00.000Z`)
    const offsetMs = Math.floor(rand() * 20 * 60 * 60 * 1000)
    docs.push({
      userId: patientId,
      game: pick.game,
      score,
      accuracy: Math.min(98, accuracy),
      durationSeconds: duration,
      playedAt: new Date(dayStartMs + offsetMs),
    })
  }

  for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
    const sessionsToday = daysAgo === 0 ? 2 : 1 + Math.floor(rand() * 2)
    for (let s = 0; s < sessionsToday; s++) {
      placeSession(gameWeights[Math.floor(rand() * gameWeights.length)], daysAgo)
    }
  }
  for (let daysAgo = 7; daysAgo < 84; daysAgo++) {
    if (rand() < 0.55) {
      const sessionsToday = rand() < 0.2 ? 2 : 1
      for (let s = 0; s < sessionsToday; s++) {
        placeSession(gameWeights[Math.floor(rand() * gameWeights.length)], daysAgo)
      }
    }
  }

  await GameResult.insertMany(docs)
  return docs.length
}

async function seedActivitiesAndCompletions(patientId) {
  const items = [
    { title: "Morning memory warm-up", timeLabel: "8:30 AM" },
    { title: "Card Match session", timeLabel: "11:00 AM" },
    { title: "Short walk with Anjali", timeLabel: "4:00 PM" },
    { title: "Word Recall session", timeLabel: "6:00 PM" },
    { title: "Evening breathing exercise", timeLabel: "8:30 PM" },
  ]

  const activities = await Activity.insertMany(
    items.map((item, i) => ({ userId: patientId, title: item.title, timeLabel: item.timeLabel, sortOrder: i })),
  )

  const completions = []
  const todayDone = [true, true, true, true, false]
  activities.forEach((activity, i) => {
    completions.push({ activityId: activity._id, userId: patientId, date: todayKey(), done: todayDone[i] })
  })

  for (let daysAgo = 1; daysAgo < 14; daysAgo++) {
    const date = dateKeyDaysAgo(daysAgo)
    activities.forEach((activity) => {
      completions.push({ activityId: activity._id, userId: patientId, date, done: rand() < 0.8 })
    })
  }

  await ActivityCompletion.insertMany(completions)
}

async function seedReminders(patientId) {
  const items = [
    { title: "Take evening medicine", timeLabel: "8:00 PM", kind: "Medicine" },
    { title: "Call Anjali", timeLabel: "6:30 PM", kind: "Family" },
    { title: "Drink a glass of water", timeLabel: "Every 2 hours", kind: "Wellness" },
  ]
  await Reminder.insertMany(
    items.map((item, i) => ({
      userId: patientId,
      title: item.title,
      timeLabel: item.timeLabel,
      kind: item.kind,
      sortOrder: i,
    })),
  )
}

async function seedWellnessToday(patientId) {
  await WellnessLog.create({
    userId: patientId,
    date: todayKey(),
    mood: "Good",
    sleepHours: 7.5,
    waterGlasses: 5,
    waterGoal: 8,
    steps: 2400,
    stepGoal: 4000,
  })
}

async function seedAlerts(patientId) {
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
  await CaregiverAlert.insertMany(items.map((item) => ({ patientId, ...item })))
}

async function run() {
  await connectDB()
  await maybeReset()

  const existingPatient = await findByEmail(PATIENT_EMAIL)
  if (existingPatient) {
    console.log(`Demo patient (${PATIENT_EMAIL}) already exists — skipping seed.`)
    console.log("Run `node src/db/seed.js --reset` to wipe and reseed everything.")
    await mongoose.disconnect()
    return
  }

  console.log("Creating demo patient and caregiver accounts...")

  const { user: patient } = await createUser({
    name: "Rahul Sharma",
    email: PATIENT_EMAIL,
    password: DEMO_PASSWORD,
    role: "patient",
  })
  const { user: caregiver } = await createUser({
    name: "Anjali Sharma",
    email: CAREGIVER_EMAIL,
    password: DEMO_PASSWORD,
    role: "caregiver",
  })

  // createUser() already seeded generic starter activities/reminders for the
  // patient — clear those so we can install the exact demo set instead.
  await Activity.deleteMany({ userId: patient.id })
  await Reminder.deleteMany({ userId: patient.id })

  await PatientProfile.updateOne(
    { _id: patient.id },
    { age: 67, condition: "Memory & cognitive care plan", careSince: "2025-03-01", cognitiveScoreBase: 78 },
  )
  await CaregiverProfile.updateOne({ _id: caregiver.id }, { relation: "Daughter · Primary caregiver" })
  await CareLink.create({ caregiverId: caregiver.id, patientId: patient.id })

  await seedActivitiesAndCompletions(patient.id)
  await seedReminders(patient.id)
  await seedWellnessToday(patient.id)
  await seedAlerts(patient.id)
  const sessionCount = await seedGameResults(patient.id)

  console.log(`Seeded ${sessionCount} historical game sessions.`)
  console.log("")
  console.log("Demo accounts ready:")
  console.log(`  Patient   ${PATIENT_EMAIL} / ${DEMO_PASSWORD}`)
  console.log(`  Caregiver ${CAREGIVER_EMAIL} / ${DEMO_PASSWORD}`)

  await mongoose.disconnect()
}

run().catch((err) => {
  console.error("[seed] Failed:", err)
  process.exit(1)
})
