const mongoose = require("mongoose")

const gameResultSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  game: { type: String, required: true, enum: ["card-match", "pattern-recall", "word-recall"] },
  score: { type: Number, required: true },
  accuracy: { type: Number, required: true },
  durationSeconds: { type: Number, required: true },
  playedAt: { type: Date, required: true, default: Date.now },
})

gameResultSchema.index({ userId: 1, playedAt: -1 })

module.exports = mongoose.model("GameResult", gameResultSchema)
