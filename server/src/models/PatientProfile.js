const mongoose = require("mongoose")

const patientProfileSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // same as the user's id (1:1)
    age: { type: Number, default: null },
    condition: { type: String, default: "Memory & cognitive care plan" },
    careSince: { type: String, required: true },
    cognitiveScoreBase: { type: Number, default: 70 },
    inviteCode: { type: String, unique: true, sparse: true },
  },
  { _id: false },
)

module.exports = mongoose.model("PatientProfile", patientProfileSchema)
