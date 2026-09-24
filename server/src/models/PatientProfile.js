const mongoose = require("mongoose")

const patientProfileSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // same as the user's id (1:1)
    age: { type: Number, default: null },
    condition: { type: String, default: "Memory & cognitive care plan" },
    careSince: { type: String, required: true },
    cognitiveScoreBase: { type: Number, default: 70 },
    inviteCode: { type: String, unique: true, sparse: true },
    phone: { type: String, default: null },
    // Safety features: a short list of people to call in an emergency, and
    // the most recent location the patient chose to share (opt-in, one tap
    // at a time — this is not continuous tracking).
    emergencyContacts: {
      type: [
        {
          name: { type: String, required: true },
          phone: { type: String, required: true },
          relation: { type: String, default: "" },
        },
      ],
      default: [],
    },
    lastLocation: {
      type: {
        lat: Number,
        lng: Number,
        updatedAt: Date,
      },
      default: null,
    },
  },
  { _id: false },
)

module.exports = mongoose.model("PatientProfile", patientProfileSchema)
