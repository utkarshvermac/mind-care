const mongoose = require("mongoose")

const activityCompletionSchema = new mongoose.Schema({
  activityId: { type: mongoose.Schema.Types.ObjectId, ref: "Activity", required: true },
  userId: { type: String, required: true, index: true },
  date: { type: String, required: true }, // YYYY-MM-DD, kept as string to match date-key lookups elsewhere
  done: { type: Boolean, default: false },
})

activityCompletionSchema.index({ activityId: 1, date: 1 }, { unique: true })
activityCompletionSchema.index({ userId: 1, date: 1 })

module.exports = mongoose.model("ActivityCompletion", activityCompletionSchema)
