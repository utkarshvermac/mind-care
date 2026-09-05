const mongoose = require("mongoose")

const wellnessLogSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  mood: { type: String, default: "Good" },
  sleepHours: { type: Number, default: 7.5 },
  waterGlasses: { type: Number, default: 0 },
  waterGoal: { type: Number, default: 8 },
  steps: { type: Number, default: 0 },
  stepGoal: { type: Number, default: 4000 },
})

wellnessLogSchema.index({ userId: 1, date: 1 }, { unique: true })

module.exports = mongoose.model("WellnessLog", wellnessLogSchema)
