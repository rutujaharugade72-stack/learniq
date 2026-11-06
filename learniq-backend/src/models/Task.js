const mongoose = require("mongoose");

// A small checklist item inside a task
const SubtaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 120 },
    done: { type: Boolean, default: false },
  },
  { _id: true }
);

// One to-do item (made by the student, or added from the study plan)
const TaskSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, maxlength: 120 },
    notes: { type: String, default: "", maxlength: 500 },
    priority: { type: String, enum: ["high", "medium", "low"], default: "medium" },
    tag: { type: String, default: "", maxlength: 40 }, // subject tag, e.g. "Python"

    // "YYYY-MM-DD" (a plain date string, so there are no timezone surprises)
    dueDate: { type: String, default: "", maxlength: 10 },

    // Reminder time as a real date (the browser sends an ISO time)
    remindAt: { type: Date, default: null },
    repeat: { type: String, enum: ["none", "daily"], default: "none" },

    done: { type: Boolean, default: false },
    doneAt: { type: Date, default: null },

    source: { type: String, enum: ["manual", "planner"], default: "manual" },
    planTaskId: { type: String, default: "", maxlength: 40 }, // links back to a plan task

    // Where "Practice" should open (the quiz page)
    link: {
      type: { type: String, enum: ["", "practice", "notes"], default: "" },
      topic: { type: String, default: "", maxlength: 120 },
      subtopic: { type: String, default: "", maxlength: 120 },
    },

    subtasks: { type: [SubtaskSchema], default: [] },
    focusMinutes: { type: Number, default: 0, min: 0, max: 100000 },
  },
  { timestamps: true }
);

// Fast "my tasks" lists
TaskSchema.index({ user: 1, done: 1, dueDate: 1 });

module.exports = mongoose.model("Task", TaskSchema);