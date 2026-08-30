const express = require("express")
const crypto = require("crypto")
const db = require("../db")
const asyncHandler = require("../utils/asyncHandler")
const { assert } = require("../utils/ApiError")
const { requireAuth } = require("../middleware/auth")
const { getAssistantReply, greetingFor } = require("../services/assistantService")

const router = express.Router()

function shapedMessage(row) {
  return { id: row.id, role: row.role, text: row.text, at: row.at }
}

function insertMessage(userId, role, text) {
  const id = crypto.randomUUID()
  const at = new Date().toISOString()
  db.prepare("INSERT INTO chat_messages (id, user_id, role, text, at) VALUES (?, ?, ?, ?, ?)").run(
    id,
    userId,
    role,
    text,
    at,
  )
  return { id, role, text, at }
}

// POST /api/assistant/message   { message }
router.post(
  "/message",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { message } = req.body || {}
    assert(typeof message === "string" && message.trim().length > 0, 400, "message is required.")

    insertMessage(req.user.id, "user", message.trim())
    const replyText = await getAssistantReply(req.user, message.trim())
    const reply = insertMessage(req.user.id, "assistant", replyText)

    res.status(201).json(reply)
  }),
)

// GET /api/assistant/history
router.get(
  "/history",
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = db
      .prepare("SELECT * FROM chat_messages WHERE user_id = ? ORDER BY at ASC")
      .all(req.user.id)

    if (rows.length === 0) {
      return res.json({
        messages: [{ id: "greeting", role: "assistant", text: greetingFor(req.user), at: new Date().toISOString() }],
      })
    }

    res.json({ messages: rows.map(shapedMessage) })
  }),
)

// DELETE /api/assistant/history
router.delete(
  "/history",
  requireAuth,
  asyncHandler(async (req, res) => {
    db.prepare("DELETE FROM chat_messages WHERE user_id = ?").run(req.user.id)
    res.status(204).end()
  }),
)

module.exports = router
