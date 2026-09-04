const mongoose = require("mongoose")

const reminderSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  timeLabel: { type: String, required: true },
  kind: { type: String, required: true },
  sortOrder: { type: Number, default: 0 },
})

module.exports = mongoose.model("Reminder", reminderSchema)
