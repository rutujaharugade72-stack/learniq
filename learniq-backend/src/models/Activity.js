const mongoose = require("mongoose");

const ActivitySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true }, // e.g. "quiz_completed", "notes_created", "plan_created"
    title: { type: String, required: true, maxlength: 120 },
    description: { type: String, default: "", maxlength: 300 },
    link: { type: String, default: "", maxlength: 200 },
    // true = a finished thing that counts toward the Daily Goal
    countsForGoal: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Fast "my recent activities" and "how many today" queries
ActivitySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Activity", ActivitySchema);