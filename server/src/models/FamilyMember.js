const mongoose = require("mongoose")

// Powers the "Family & Faces" photo memory book and the Face & Name Recall
// game. photoDataUrl stores a small compressed image as a base64 data URL —
// simplest possible storage for a demo build with no object-storage bucket
// configured. Keep photos small on the client before upload (see lib/api.ts).
const familyMemberSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    relation: { type: String, required: true, trim: true },
    note: { type: String, default: "" },
    photoDataUrl: { type: String, default: null },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } },
)

module.exports = mongoose.model("FamilyMember", familyMemberSchema)
