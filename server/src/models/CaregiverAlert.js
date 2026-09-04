const mongoose = require("mongoose")

const caregiverAlertSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, index: true },
    tone: { type: String, required: true, enum: ["warning", "info", "success"] },
    title: { type: String, required: true },
    detail: { type: String, required: true },
    dismissed: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } },
)

caregiverAlertSchema.index({ patientId: 1, dismissed: 1 })

module.exports = mongoose.model("CaregiverAlert", caregiverAlertSchema)
