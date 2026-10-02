require("dotenv").config()

const config = {
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "30d",
  corsOrigin: process.env.CORS_ORIGIN || "*",
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mindcare",
  geminiApiKey: process.env.GEMINI_API_KEY || null,
  // Reminder/activity `timeLabel`s (e.g. "8:00 PM") are wall-clock times in
  // the patient's local timezone, but the server always runs in UTC. The
  // caregiver-alert checks (missed activity/medication, "no water logged
  // yet") need to compare "now" against those labels in the same timezone,
  // or every alert fires hours off from the real local time. There's no
  // per-user timezone stored yet, so this is a single app-wide default —
  // IST (UTC+5:30), since that's this app's target region — overridable via
  // env for a differently-located deployment.
  alertTimezoneOffsetMinutes: process.env.ALERT_TIMEZONE_OFFSET_MINUTES
    ? parseInt(process.env.ALERT_TIMEZONE_OFFSET_MINUTES, 10)
    : 330,
  // Email verification (signup OTP). Leave SMTP_* unset for local/demo use —
  // see services/emailService.js's console-log fallback.
  smtp: {
    host: process.env.SMTP_HOST || null,
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || null,
    pass: process.env.SMTP_PASS || null,
    from: process.env.SMTP_FROM || null,
  },
  otpExpiryMinutes: process.env.OTP_EXPIRY_MINUTES ? parseInt(process.env.OTP_EXPIRY_MINUTES, 10) : 10,
  otpResendCooldownSeconds: process.env.OTP_RESEND_COOLDOWN_SECONDS
    ? parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS, 10)
    : 60,
  otpMaxAttempts: process.env.OTP_MAX_ATTEMPTS ? parseInt(process.env.OTP_MAX_ATTEMPTS, 10) : 5,
}

if (process.env.NODE_ENV === "production" && config.jwtSecret === "dev-secret-change-me") {
  console.warn("[config] WARNING: JWT_SECRET is not set. Set a real secret before deploying to production.")
}

module.exports = config
