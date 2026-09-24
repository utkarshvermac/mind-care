const mongoose = require("mongoose")

// Mirrors ActivityCompletion — tracks whether a reminder (e.g. a medication
// dose) was confirmed done on a given day, without mutating the Reminder
// template itself.
const reminderCompletionSchema = new mongoose.Schema({
  reminderId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  userId: { type: String, required: true, index: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  done: { type: Boolean, default: false },
})

reminderCompletionSchema.index({ reminderId: 1, date: 1 }, { unique: true })

module.exports = mongoose.model("ReminderCompletion", reminderCompletionSchema)
