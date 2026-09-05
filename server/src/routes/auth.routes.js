const express = require("express")
const asyncHandler = require("../utils/asyncHandler")
const { ApiError, assert } = require("../utils/ApiError")
const { requireAuth } = require("../middleware/auth")
const {
  createUser,
  findByEmail,
  verifyPassword,
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

    const token = signToken(user)
    res.status(201).json({ token, role: user.role, user: await shapedProfile(user) })
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

    const token = signToken(user)
    res.json({ token, role: user.role, user: await shapedProfile(user) })
  }),
)

// POST /api/auth/forgot-password  { email }
// No email service is configured for this project, so the reset link is
// returned directly in the response instead of being emailed. Swap the
// `resetUrl` handling here for a real mailer (e.g. Nodemailer) in production
// — never expose the token to the client once that's in place.
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
