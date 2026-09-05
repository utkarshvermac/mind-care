const mongoose = require("mongoose")

const userSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // uuid, kept as _id so every model can just store userId strings
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ["patient", "caregiver"] },
    initials: { type: String, required: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false }, _id: false },
)

module.exports = mongoose.model("User", userSchema)
