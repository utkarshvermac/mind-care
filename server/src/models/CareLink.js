const mongoose = require("mongoose")

const careLinkSchema = new mongoose.Schema(
  {
    caregiverId: { type: String, required: true, index: true },
    patientId: { type: String, required: true, index: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } },
)

careLinkSchema.index({ caregiverId: 1, patientId: 1 }, { unique: true })

module.exports = mongoose.model("CareLink", careLinkSchema)
