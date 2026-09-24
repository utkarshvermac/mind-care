const mongoose = require("mongoose")

// Life-story / legacy journal. Entries are short reflections the patient
// (or a caregiver, on their behalf) records — text, and optionally a short
// voice note captured with the browser's MediaRecorder API and stored as a
// base64 data URL, same simplified-storage approach as FamilyMember photos.
const journalEntrySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    text: { type: String, default: "" },
    audioDataUrl: { type: String, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } },
)

journalEntrySchema.index({ userId: 1, createdAt: -1 })

module.exports = mongoose.model("JournalEntry", journalEntrySchema)
