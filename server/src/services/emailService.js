const nodemailer = require("nodemailer")
const config = require("../config")

let transporter // lazily created, cached — see getTransporter()
let triedInit = false

function getTransporter() {
  if (triedInit) return transporter
  triedInit = true
  if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) {
    transporter = null
    return null
  }
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
  })
  return transporter
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c])
}

/**
 * Sends the signup verification code by email.
 *
 * No SMTP service is required to run this project locally: if none is
 * configured (see server/.env.example), the code is logged to the server
 * console instead and { delivered: false } is returned so the caller can
 * fall back to returning it directly in the API response — the same
 * demo-mode pattern already used for password-reset tokens in
 * auth.routes.js's /forgot-password handler.
 */
async function sendOtpEmail({ to, name, code }) {
  const transport = getTransporter()
  if (!transport) {
    // eslint-disable-next-line no-console
    console.log(`[emailService] SMTP not configured — verification code for ${to}: ${code}`)
    return { delivered: false }
  }

  try {
    await transport.sendMail({
      from: config.smtp.from || '"MindCare" <no-reply@mindcare.app>',
      to,
      subject: "Your MindCare verification code",
      text: `Hi ${name},\n\nYour MindCare verification code is ${code}. It expires in ${config.otpExpiryMinutes} minutes.\n\nIf you didn't create a MindCare account, you can safely ignore this email.`,
      html: `<p>Hi ${escapeHtml(name)},</p><p>Your MindCare verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:16px 0;">${escapeHtml(code)}</p><p>It expires in ${config.otpExpiryMinutes} minutes.</p><p style="color:#6b7280;font-size:13px;">If you didn't create a MindCare account, you can safely ignore this email.</p>`,
    })
    return { delivered: true }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[emailService] Failed to send OTP email:", err.message)
    // Fall back to the dev-mode path rather than failing signup outright —
    // a misconfigured/unreachable SMTP server shouldn't lock people out.
    // eslint-disable-next-line no-console
    console.log(`[emailService] Verification code for ${to}: ${code}`)
    return { delivered: false }
  }
}

module.exports = { sendOtpEmail }
