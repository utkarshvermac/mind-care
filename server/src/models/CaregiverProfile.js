const mongoose = require("mongoose")

const caregiverProfileSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    relation: { type: String, default: "Caregiver" },
  },
  { _id: false },
)

module.exports = mongoose.model("CaregiverProfile", caregiverProfileSchema)
