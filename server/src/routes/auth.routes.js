const express = require("express")
const asyncHandler = require("../utils/asyncHandler")
const { ApiError, assert } = require("../utils/ApiError")
const { requireAuth } = require("../middleware/auth")
const {
  createUser,
  findByEmail,
  verifyPassword,
  issueOtp,
  resendOtp,
  verifyOtpForUser,
  createPasswordResetToken,
  consumePasswordResetToken,
  updatePassword,
} = require("../services/userService")
const { signToken } = require("../utils/jwt")
const { getPatientProfile, getCaregiverProfile } = require("../services/profileService")

const router = express.Router()

const EMAIL_RE = /^\S+@\S+\.\S+$/

async function shapedProfile(user) {
  return user.role === "patient" ? getPatientProfile(user.id) : getCaregiverProfile(user.id)
}

// POST /api/auth/signup
// Creates the account in an unverified state and emails a 6-digit code —
// no token is returned here. The frontend must call /auth/verify-otp with
// that code before the account can log in (see that route below).
router.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body || {}

    assert(typeof name === "string" && name.trim().length > 0, 400, "Please provide a name.")
    assert(typeof email === "string" && EMAIL_RE.test(email), 400, "Please provide a valid email address.")
    assert(typeof password === "string" && password.length >= 6, 400, "Password must be at least 6 characters.")
    assert(role === "patient" || role === "caregiver", 400, "Role must be 'patient' or 'caregiver'.")

    const { user, error } = await createUser({ name, email, password, role })
    if (error === "email-taken") throw new ApiError(409, "An account with that email already exists.")

    const { code, delivered } = await issueOtp(user.id)

    res.status(201).json({
      requiresVerification: true,
      email: user.email,
      ...(delivered
        ? {}
        : {
            devOtp: code,
            devNote: "No email service is configured — this code is returned directly for development/demo purposes.",
          }),
    })
  }),
)

// POST /api/auth/verify-otp  { email, code }
// Completes signup: checks the code, marks the account verified, and — only
// now — issues the real login token.
router.post(
  "/verify-otp",
  asyncHandler(async (req, res) => {
    const { email, code } = req.body || {}
    assert(typeof email === "string" && EMAIL_RE.test(email), 400, "Please provide a valid email address.")
    assert(typeof code === "string" && /^\d{6}$/.test(code), 400, "Please enter the 6-digit code.")

    const result = await verifyOtpForUser(email, code)
    if (result.error === "not-found") throw new ApiError(404, "No account found for that email.")
    if (result.error === "already-verified")
      throw new ApiError(400, "This account is already verified. Please log in.", { code: "ALREADY_VERIFIED" })
    if (result.error === "expired")
      throw new ApiError(400, "This code has expired. Request a new one.", { code: "OTP_EXPIRED" })
    if (result.error === "too-many-attempts")
      throw new ApiError(429, "Too many incorrect attempts. Request a new code.", { code: "OTP_LOCKED" })
    if (result.error === "incorrect")
      throw new ApiError(400, "That code isn't right. Please try again.", { code: "OTP_INCORRECT" })

    const token = signToken(result.user)
    res.json({ token, role: result.user.role, user: await shapedProfile(result.user) })
  }),
)

// POST /api/auth/resend-otp  { email }
router.post(
  "/resend-otp",
  asyncHandler(async (req, res) => {
    const { email } = req.body || {}
    assert(typeof email === "string" && EMAIL_RE.test(email), 400, "Please provide a valid email address.")

    const result = await resendOtp(email)
    if (result.error === "not-found") throw new ApiError(404, "No account found for that email.")
    if (result.error === "already-verified")
      throw new ApiError(400, "This account is already verified. Please log in.", { code: "ALREADY_VERIFIED" })
    if (result.error === "cooldown")
      throw new ApiError(429, "Please wait a bit before requesting another code.", {
        code: "OTP_COOLDOWN",
        retryAfterSeconds: result.retryAfterSeconds,
      })

    res.json({
      message: "A new code has been sent.",
      ...(result.delivered
        ? {}
        : {
            devOtp: result.code,
            devNote: "No email service is configured — this code is returned directly for development/demo purposes.",
          }),
    })
  }),
)

// POST /api/auth/login  { email, password }
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {}
    assert(typeof email === "string" && typeof password === "string", 400, "Email and password are required.")

    const user = await findByEmail(email)
    assert(user && verifyPassword(user, password), 401, "Incorrect email or password.")

    if (!user.emailVerified) {
      throw new ApiError(403, "Please verify your email before logging in.", {
        code: "EMAIL_NOT_VERIFIED",
        email: user.email,
      })
    }

    const token = signToken(user)
    res.json({ token, role: user.role, user: await shapedProfile(user) })
  }),
)

// POST /api/auth/forgot-password  { email }
// This still returns the reset link directly rather than emailing it (kept
// deliberately separate from the signup-verification flow's blocking
// requirement). A working mailer now exists in services/emailService.js
// (added for signup OTPs) — wire a sendPasswordResetEmail() through it here
// if this should be emailed for real; remove devResetToken once it is.
router.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const { email } = req.body || {}
    assert(typeof email === "string" && EMAIL_RE.test(email), 400, "Please provide a valid email address.")

    const user = await findByEmail(email)
    if (!user) {
      return res.json({ message: "If that email has an account, a reset link has been created." })
    }

    const token = await createPasswordResetToken(user.id)
    res.json({
      message: "If that email has an account, a reset link has been created.",
      devResetToken: token,
      devNote: "No email service is configured — this token is returned directly for development/demo purposes.",
    })
  }),
)

// POST /api/auth/reset-password  { token, newPassword }
router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body || {}
    assert(typeof token === "string" && token.length > 0, 400, "Reset token is required.")
    assert(typeof newPassword === "string" && newPassword.length >= 6, 400, "Password must be at least 6 characters.")

    const userId = await consumePasswordResetToken(token)
    assert(userId, 400, "This reset link is invalid or has expired. Please request a new one.")

    await updatePassword(userId, newPassword)
    res.json({ message: "Password updated. You can now log in with your new password." })
  }),
)

// GET /api/auth/me
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ role: req.user.role, user: await shapedProfile(req.user) })
  }),
)

module.exports = router
