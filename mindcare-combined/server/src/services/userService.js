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

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no O/0/I/1 to avoid confusion when read aloud

function generateInviteCode() {
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = ""
    for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
    const taken = db.prepare("SELECT 1 FROM patient_profiles WHERE invite_code = ?").get(code)
    if (!taken) return code
  }
  // Astronomically unlikely, but fall back to a longer code if 20 tries collided.
  return crypto.randomUUID().slice(0, 8).toUpperCase()
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
    const inviteCode = generateInviteCode()
    db.prepare(
      "INSERT INTO patient_profiles (user_id, age, condition, care_since, cognitive_score_base, invite_code) VALUES (?, NULL, ?, ?, ?, ?)",
    ).run(id, "Memory & cognitive care plan", todayKey(), 70, inviteCode)
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

/** Creates a 15-minute reset token for the given user. */
function createPasswordResetToken(userId) {
  const token = crypto.randomBytes(24).toString("hex")
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
  db.prepare("INSERT INTO password_resets (token, user_id, expires_at, used) VALUES (?, ?, ?, 0)").run(
    token,
    userId,
    expiresAt,
  )
  return token
}

/** Returns the user id for a valid, unused, unexpired token — or null. */
function consumePasswordResetToken(token) {
  const row = db.prepare("SELECT * FROM password_resets WHERE token = ?").get(token)
  if (!row || row.used) return null
  if (new Date(row.expires_at).getTime() < Date.now()) return null
  db.prepare("UPDATE password_resets SET used = 1 WHERE token = ?").run(token)
  return row.user_id
}

function updatePassword(userId, newPassword) {
  const passwordHash = bcrypt.hashSync(newPassword, 10)
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, userId)
}

function getInviteCode(patientId) {
  const row = db.prepare("SELECT invite_code FROM patient_profiles WHERE user_id = ?").get(patientId)
  return row ? row.invite_code : null
}

function linkPatientByInviteCode(caregiverId, code) {
  const profile = db.prepare("SELECT user_id FROM patient_profiles WHERE invite_code = ?").get(code.toUpperCase())
  if (!profile) return { error: "invalid-code" }

  const existing = db
    .prepare("SELECT 1 FROM care_links WHERE caregiver_id = ? AND patient_id = ?")
    .get(caregiverId, profile.user_id)
  if (existing) return { error: "already-linked" }

  db.prepare("INSERT INTO care_links (id, caregiver_id, patient_id) VALUES (?, ?, ?)").run(
    crypto.randomUUID(),
    caregiverId,
    profile.user_id,
  )
  return { patientId: profile.user_id }
}

module.exports = {
  initialsOf,
  createUser,
  findByEmail,
  verifyPassword,
  createPasswordResetToken,
  consumePasswordResetToken,
  updatePassword,
  getInviteCode,
  linkPatientByInviteCode,
  seedDefaultActivitiesAndReminders,
  DEFAULT_ACTIVITIES,
  DEFAULT_REMINDERS,
}
