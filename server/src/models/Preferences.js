const mongoose = require("mongoose")

const preferencesSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    theme: { type: String, enum: ["light", "dark"], default: "light" },
    elderMode: { type: Boolean, default: false },
    fontScale: { type: String, enum: ["normal", "large", "xlarge"], default: "normal" },
    reduceMotion: { type: Boolean, default: false },
    notifications: { type: Boolean, default: true },
    sound: { type: Boolean, default: true },
    language: { type: String, default: "en" },
    shareWithCaregiver: { type: Boolean, default: true },
  },
  { _id: false },
)

module.exports = mongoose.model("Preferences", preferencesSchema)
