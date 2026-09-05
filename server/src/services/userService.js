const crypto = require("crypto")
const bcrypt = require("bcryptjs")
const User = require("../models/User")
const PatientProfile = require("../models/PatientProfile")
const CaregiverProfile = require("../models/CaregiverProfile")
const Preferences = require("../models/Preferences")
const CareLink = require("../models/CareLink")
const PasswordReset = require("../models/PasswordReset")
const Activity = require("../models/Activity")
const Reminder = require("../models/Reminder")
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

async function seedDefaultActivitiesAndReminders(userId) {
  await Activity.insertMany(
    DEFAULT_ACTIVITIES.map((a, i) => ({ userId, title: a.title, timeLabel: a.timeLabel, sortOrder: i })),
  )
  await Reminder.insertMany(
    DEFAULT_REMINDERS.map((r, i) => ({ userId, title: r.title, timeLabel: r.timeLabel, kind: r.kind, sortOrder: i })),
  )
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no O/0/I/1 to avoid confusion when read aloud

async function generateInviteCode() {
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = ""
    for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
    const taken = await PatientProfile.exists({ inviteCode: code })
    if (!taken) return code
  }
  return crypto.randomUUID().slice(0, 8).toUpperCase()
}

/**
 * Creates a user document plus the role-specific profile, default
 * preferences, and (for patients) a starter checklist/reminders. Used by
 * both the /auth/signup route and the demo data seed script.
 */
async function createUser({ name, email, password, role }) {
  const existing = await User.exists({ email: email.toLowerCase() })
  if (existing) return { error: "email-taken" }

  const id = crypto.randomUUID()
  const passwordHash = bcrypt.hashSync(password, 10)
  const initials = initialsOf(name)

  await User.create({ _id: id, name: name.trim(), email: email.toLowerCase(), passwordHash, role, initials })
  await Preferences.create({ _id: id })

  if (role === "patient") {
    const inviteCode = await generateInviteCode()
    await PatientProfile.create({
      _id: id,
      age: null,
      condition: "Memory & cognitive care plan",
      careSince: todayKey(),
      cognitiveScoreBase: 70,
      inviteCode,
    })
    await seedDefaultActivitiesAndReminders(id)
  } else {
    await CaregiverProfile.create({ _id: id, relation: "Caregiver" })
  }

  const user = await User.findById(id).lean()
  user.id = user._id
  return { user }
}

async function findByEmail(email) {
  const user = await User.findOne({ email: email.toLowerCase() }).lean()
  if (user) user.id = user._id
  return user
}

function verifyPassword(user, password) {
  return bcrypt.compareSync(password, user.passwordHash)
}

/** Creates a 15-minute reset token for the given user. */
async function createPasswordResetToken(userId) {
  const token = crypto.randomBytes(24).toString("hex")
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
  await PasswordReset.create({ token, userId, expiresAt, used: false })
  return token
}

/** Returns the user id for a valid, unused, unexpired token — or null. */
async function consumePasswordResetToken(token) {
  const row = await PasswordReset.findOne({ token })
  if (!row || row.used) return null
  if (row.expiresAt.getTime() < Date.now()) return null
  row.used = true
  await row.save()
  return row.userId
}

async function updatePassword(userId, newPassword) {
  const passwordHash = bcrypt.hashSync(newPassword, 10)
  await User.updateOne({ _id: userId }, { passwordHash })
}

async function getInviteCode(patientId) {
  const profile = await PatientProfile.findById(patientId).lean()
  return profile ? profile.inviteCode : null
}

async function linkPatientByInviteCode(caregiverId, code) {
  const profile = await PatientProfile.findOne({ inviteCode: code.toUpperCase() }).lean()
  if (!profile) return { error: "invalid-code" }

  const existing = await CareLink.exists({ caregiverId, patientId: profile._id })
  if (existing) return { error: "already-linked" }

  await CareLink.create({ caregiverId, patientId: profile._id })
  return { patientId: profile._id }
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
