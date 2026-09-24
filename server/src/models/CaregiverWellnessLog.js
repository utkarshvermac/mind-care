const mongoose = require("mongoose")

// A lightweight, separate check-in for the CAREGIVER's own wellbeing —
// caregiver burnout is a real and often-ignored risk. Deliberately not
// visible to the patient; this is for the caregiver only.
const caregiverWellnessLogSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  mood: { type: Number, min: 1, max: 5, default: null }, // 1 = struggling, 5 = great
  stress: { type: Number, min: 1, max: 5, default: null }, // 1 = calm, 5 = overwhelmed
  note: { type: String, default: "" },
})

caregiverWellnessLogSchema.index({ userId: 1, date: 1 }, { unique: true })

module.exports = mongoose.model("CaregiverWellnessLog", caregiverWellnessLogSchema)
