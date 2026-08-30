const crypto = require("crypto")
const bcrypt = require("bcryptjs")
const db = require("../db")
const { todayKey } = require("../utils/dates")

function initialsOf(name) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

const DEFAULT_ACTIVITIES = [
  { title: "Morning memory warm-up", timeLabel: "8:30 AM" },
  { title: "Play a cognitive game", timeLabel: "11:00 AM" },
  { title: "Short walk or stretch", timeLabel: "4:00 PM" },
  { title: "Evening wind-down", timeLabel: "8:30 PM" },
]

const DEFAULT_REMINDERS = [
  { title: "Take evening medicine", timeLabel: "8:00 PM", kind: "Medicine" },
  { title: "Drink a glass of water", timeLabel: "Every 2 hours", kind: "Wellness" },
]

function seedDefaultActivitiesAndReminders(userId) {
  const insertActivity = db.prepare(
    "INSERT INTO activities (id, user_id, title, time_label, sort_order) VALUES (?, ?, ?, ?, ?)",
  )
  DEFAULT_ACTIVITIES.forEach((a, i) => insertActivity.run(crypto.randomUUID(), userId, a.title, a.timeLabel, i))

  const insertReminder = db.prepare(
    "INSERT INTO reminders (id, user_id, title, time_label, kind, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
  )
  DEFAULT_REMINDERS.forEach((r, i) =>
    insertReminder.run(crypto.randomUUID(), userId, r.title, r.timeLabel, r.kind, i),
  )
}

/**
 * Creates a user row plus the role-specific profile, default preferences,
 * and (for patients) a starter checklist/reminders. Used by both the
 * /auth/signup route and the demo data seed script.
 */
function createUser({ name, email, password, role }) {
  const existing = db.prepare("SELECT 1 FROM users WHERE email = ?").get(email.toLowerCase())
  if (existing) return { error: "email-taken" }

  const id = crypto.randomUUID()
  const passwordHash = bcrypt.hashSync(password, 10)
  const initials = initialsOf(name)

  db.prepare(
    "INSERT INTO users (id, name, email, password_hash, role, initials) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(id, name.trim(), email.toLowerCase(), passwordHash, role, initials)

  db.prepare("INSERT INTO preferences (user_id) VALUES (?)").run(id)

  if (role === "patient") {
    db.prepare(
      "INSERT INTO patient_profiles (user_id, age, condition, care_since, cognitive_score_base) VALUES (?, NULL, ?, ?, ?)",
    ).run(id, "Memory & cognitive care plan", todayKey(), 70)
    seedDefaultActivitiesAndReminders(id)
  } else {
    db.prepare("INSERT INTO caregiver_profiles (user_id, relation) VALUES (?, ?)").run(id, "Caregiver")
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id)
  return { user }
}

function findByEmail(email) {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase())
}

function verifyPassword(user, password) {
  return bcrypt.compareSync(password, user.password_hash)
}

module.exports = {
  initialsOf,
  createUser,
  findByEmail,
  verifyPassword,
  seedDefaultActivitiesAndReminders,
  DEFAULT_ACTIVITIES,
  DEFAULT_REMINDERS,
}
