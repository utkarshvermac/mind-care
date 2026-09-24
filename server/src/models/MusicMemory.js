const mongoose = require("mongoose")

// "Music Memories" — a curated list of songs that matter to the patient.
// Deliberately metadata-only (title/artist/an optional external link the
// caregiver pastes in) rather than embedding or streaming actual audio,
// since MindCare doesn't hold music licensing.
const musicMemorySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    artist: { type: String, default: "" },
    note: { type: String, default: "" },
    link: { type: String, default: null },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } },
)

module.exports = mongoose.model("MusicMemory", musicMemorySchema)
