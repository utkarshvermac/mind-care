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
const { generateOtp, hashOtp, otpMatches } = require("../utils/otp")
const { sendOtpEmail } = require("./emailService")
const config = require("../config")

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

async function createRoleProfile(id, role) {
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
}

/**
 * Creates a user document plus the role-specific profile, default
 * preferences, and (for patients) a starter checklist/reminders. Used by
 * both the /auth/signup route and the demo data seed script.
 *
 * If an *unverified* account already exists for this email (an abandoned
 * signup — e.g. the OTP email never arrived, or they just changed their
 * mind about their password), this restarts it in place rather than
 * hard-blocking: nobody can have logged into an unverified account, and the
 * fresh OTP the caller issues right after this always goes to the real
 * inbox either way, so there's nothing unsafe about letting them retry. A
 * *verified* account, though, is a real account — signup must never be able
 * to take that over.
 */
async function createUser({ name, email, password, role, emailVerified = false }) {
  const normalizedEmail = email.toLowerCase()
  const existing = await User.findOne({ email: normalizedEmail })

  if (existing) {
    if (existing.emailVerified) return { error: "email-taken" }

    // This email already has a signup in progress but was never verified.
    // Don't let an unauthenticated resubmission of the signup form change
    // its name/password/role — that would let anyone who merely knows a
    // pending email silently plant a password on someone else's
    // soon-to-be-verified account. Just treat this as "resend my code";
    // the route below issues a fresh OTP either way, so the real owner
    // never actually hits a dead end.
    const user = existing.toObject()
    user.id = user._id
    return { user, resumed: true }
  }

  const id = crypto.randomUUID()
  await User.create({
    _id: id,
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: bcrypt.hashSync(password, 10),
    role,
    initials: initialsOf(name),
    emailVerified,
  })
  await Preferences.create({ _id: id })
  await createRoleProfile(id, role)

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

/**
 * Generates a fresh 6-digit code for the given user, stores its hash (never
 * the plain code) with an expiry, resets the attempt counter, and emails it.
 * Used both right after signup and by the /auth/resend-otp route.
 */
async function issueOtp(userId) {
  const user = await User.findById(userId)
  if (!user) return { error: "not-found" }

  const code = generateOtp()
  user.otpCodeHash = hashOtp(code)
  user.otpExpiresAt = new Date(Date.now() + config.otpExpiryMinutes * 60 * 1000)
  user.otpAttempts = 0
  user.otpLastSentAt = new Date()
  await user.save()

  const { delivered } = await sendOtpEmail({ to: user.email, name: user.name, code })
  return { delivered, code }
}

/**
 * Re-sends a verification code, enforcing a cooldown between sends so the
 * endpoint can't be used to spam an inbox. Returns { error: "cooldown",
 * retryAfterSeconds } while the cooldown is active.
 */
async function resendOtp(email) {
  const user = await User.findOne({ email: email.toLowerCase() })
  if (!user) return { error: "not-found" }
  if (user.emailVerified) return { error: "already-verified" }

  if (user.otpLastSentAt) {
    const elapsedMs = Date.now() - user.otpLastSentAt.getTime()
    const cooldownMs = config.otpResendCooldownSeconds * 1000
    if (elapsedMs < cooldownMs) {
      return { error: "cooldown", retryAfterSeconds: Math.ceil((cooldownMs - elapsedMs) / 1000) }
    }
  }

  return issueOtp(user._id)
}

/**
 * Checks a submitted code against the stored hash. On success, marks the
 * account verified and clears the OTP fields. Wrong codes increment a
 * per-account attempt counter (capped by config.otpMaxAttempts) rather than
 * relying only on the general per-IP auth rate limit, since a shared
 * network shouldn't let one account's code go unlimited-guessable.
 */
async function verifyOtpForUser(email, code) {
  const user = await User.findOne({ email: email.toLowerCase() })
  if (!user) return { error: "not-found" }
  // Do NOT accept any code here once verified — this must never become a
  // password-free login path. A double-submitted verify (e.g. the user
  // clicks "Verify" twice) is handled by the frontend treating this error
  // as a soft-success and redirecting to /login, not by this endpoint
  // silently issuing a token for an unchecked code.
  if (user.emailVerified) return { error: "already-verified" }
  if (!user.otpExpiresAt || user.otpExpiresAt.getTime() < Date.now()) return { error: "expired" }
  if (user.otpAttempts >= config.otpMaxAttempts) return { error: "too-many-attempts" }

  if (!otpMatches(code, user.otpCodeHash)) {
    user.otpAttempts += 1
    await user.save()
    return { error: "incorrect" }
  }

  user.emailVerified = true
  user.otpCodeHash = null
  user.otpExpiresAt = null
  user.otpAttempts = 0
  await user.save()

  const lean = user.toObject()
  lean.id = lean._id
  return { user: lean }
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
  issueOtp,
  resendOtp,
  verifyOtpForUser,
  createPasswordResetToken,
  consumePasswordResetToken,
  updatePassword,
  getInviteCode,
  linkPatientByInviteCode,
  seedDefaultActivitiesAndReminders,
  DEFAULT_ACTIVITIES,
  DEFAULT_REMINDERS,
}
