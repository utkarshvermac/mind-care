const mongoose = require("mongoose")

const userSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // uuid, kept as _id so every model can just store userId strings
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ["patient", "caregiver"] },
    initials: { type: String, required: true },
    // Email verification (OTP sent at signup) — see services/userService.js's
    // issueOtp/verifyOtpForUser. A user can't log in until emailVerified is
    // true. The code itself is never stored in plain text, only its hash.
    emailVerified: { type: Boolean, default: false },
    otpCodeHash: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
    otpAttempts: { type: Number, default: 0 },
    otpLastSentAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false }, _id: false },
)

module.exports = mongoose.model("User", userSchema)
