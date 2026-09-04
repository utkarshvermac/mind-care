const mongoose = require("mongoose")

const chatMessageSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  role: { type: String, required: true, enum: ["user", "assistant"] },
  text: { type: String, required: true },
  at: { type: Date, required: true, default: Date.now },
})

chatMessageSchema.index({ userId: 1, at: 1 })

module.exports = mongoose.model("ChatMessage", chatMessageSchema)
