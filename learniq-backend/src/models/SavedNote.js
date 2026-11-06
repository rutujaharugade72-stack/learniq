const mongoose = require("mongoose");

// One set of notes or one summary that a student generated and kept.
// The result is stored as-is, so "My notes" can reopen it without calling the AI again.
const savedNoteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    mode: { type: String, enum: ["notes", "summary"], required: true },
    level: { type: String, default: "" },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    materialId: { type: mongoose.Schema.Types.ObjectId, ref: "Material", default: null },
    materialTitle: { type: String, default: "" },
    truncated: { type: Boolean, default: false },
    result: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SavedNote", savedNoteSchema);