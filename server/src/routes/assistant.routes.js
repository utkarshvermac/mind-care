const express = require("express")
const ChatMessage = require("../models/ChatMessage")
const asyncHandler = require("../utils/asyncHandler")
const { assert } = require("../utils/ApiError")
const { requireAuth } = require("../middleware/auth")
const { getAssistantReply, greetingFor } = require("../services/assistantService")

const router = express.Router()

function shapedMessage(doc) {
  return { id: String(doc._id), role: doc.role, text: doc.text, at: doc.at.toISOString() }
}

// POST /api/assistant/message   { message }
router.post(
  "/message",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { message } = req.body || {}
    assert(typeof message === "string" && message.trim().length > 0, 400, "message is required.")

    await ChatMessage.create({ userId: req.user.id, role: "user", text: message.trim(), at: new Date() })
    const replyText = await getAssistantReply(req.user, message.trim())
    const reply = await ChatMessage.create({ userId: req.user.id, role: "assistant", text: replyText, at: new Date() })

    res.status(201).json(shapedMessage(reply))
  }),
)

// GET /api/assistant/history
router.get(
  "/history",
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = await ChatMessage.find({ userId: req.user.id }).sort({ at: 1 })

    if (rows.length === 0) {
      return res.json({
        messages: [
          { id: "greeting", role: "assistant", text: await greetingFor(req.user), at: new Date().toISOString() },
        ],
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
    await ChatMessage.deleteMany({ userId: req.user.id })
    res.status(204).end()
  }),
)

module.exports = router
