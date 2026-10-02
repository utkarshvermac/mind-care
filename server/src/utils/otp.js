const crypto = require("crypto")

/** A 6-digit numeric code, e.g. "042917". Zero-padded so it's always 6 digits. */
function generateOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0")
}

// The code is short-lived and already rate-limited (a handful of attempts,
// then it expires), so a fast, unsalted hash is enough here — unlike
// passwords, there's no long-term value in a leaked hash, and it never
// leaves this file. Never store or log the plain code outside of the
// dev-mode console fallback in emailService.js.
function hashOtp(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex")
}

function otpMatches(code, hash) {
  if (!hash || typeof code !== "string") return false
  const a = Buffer.from(hashOtp(code))
  const b = Buffer.from(hash)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

module.exports = { generateOtp, hashOtp, otpMatches }
