const express = require("express")
const asyncHandler = require("../utils/asyncHandler")
const { ApiError, assert } = require("../utils/ApiError")
const { requireAuth } = require("../middleware/auth")
const { createUser, findByEmail, verifyPassword } = require("../services/userService")
const { signToken } = require("../utils/jwt")
const { getPatientProfile, getCaregiverProfile } = require("../services/profileService")

const router = express.Router()

const EMAIL_RE = /^\S+@\S+\.\S+$/

function shapedProfile(user) {
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

    const { user, error } = createUser({ name, email, password, role })
    if (error === "email-taken") throw new ApiError(409, "An account with that email already exists.")

    const token = signToken(user)
    res.status(201).json({ token, role: user.role, user: shapedProfile(user) })
  }),
)

// POST /api/auth/login  { email, password }
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {}
    assert(typeof email === "string" && typeof password === "string", 400, "Email and password are required.")

    const user = findByEmail(email)
    assert(user && verifyPassword(user, password), 401, "Incorrect email or password.")

    const token = signToken(user)
    res.json({ token, role: user.role, user: shapedProfile(user) })
  }),
)

// POST /api/auth/demo  { role }
// Convenience endpoint for the frontend's "Continue as Patient / Caregiver"
// buttons — logs into the seeded demo account for that role. Not meant for
// production use with real user data.
router.post(
  "/demo",
  asyncHandler(async (req, res) => {
    const { role } = req.body || {}
    assert(role === "patient" || role === "caregiver", 400, "Role must be 'patient' or 'caregiver'.")

    const email = role === "patient" ? "rahul.sharma@mindcare.demo" : "anjali.sharma@mindcare.demo"
    const user = findByEmail(email)
    assert(user, 404, "Demo account not found. Did you run `npm run seed`?")

    const token = signToken(user)
    res.json({ token, role: user.role, user: shapedProfile(user) })
  }),
)

// GET /api/auth/me
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ role: req.user.role, user: shapedProfile(req.user) })
  }),
)

module.exports = router
