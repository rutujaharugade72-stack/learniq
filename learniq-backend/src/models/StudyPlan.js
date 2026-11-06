const mongoose = require("mongoose");

// One task inside a plan day (made by the engine or added by the student)
const PlanTaskSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, maxlength: 40 }, // e.g. "d0-t1" or "m-abc123"
    type: {
      type: String,
      enum: ["learn", "practice", "retest", "revision", "custom"],
      default: "custom",
    },
    title: { type: String, required: true, maxlength: 120 },
    minutes: { type: Number, default: 15, min: 5, max: 240 },
    topic: { type: String, default: "", maxlength: 120 },
    subtopic: { type: String, default: "", maxlength: 120 },
    reason: { type: String, default: "", maxlength: 300 },
    priority: { type: String, enum: ["high", "medium", "low"], default: "medium" },
    done: { type: Boolean, default: false },
    doneAt: { type: Date, default: null },
    // Optional reminder time (a real date, so the timezone is safe)
    remindAt: { type: Date, default: null },
    source: { type: String, enum: ["engine", "manual"], default: "engine" },
  },
  { _id: false }
);

// One calendar day of the plan
const PlanDaySchema = new mongoose.Schema(
  {
    index: { type: Number, required: true },
    date: { type: String, required: true, maxlength: 10 }, // "YYYY-MM-DD"
    label: { type: String, default: "", maxlength: 20 }, // "Day 1"
    weekday: { type: String, default: "", maxlength: 10 }, // "Tue"
    capacity: { type: Number, default: 0 },
    rest: { type: Boolean, default: false },
    tasks: { type: [PlanTaskSchema], default: [] },
  },
  { _id: false }
);

const StudyPlanSchema = new mongoose.Schema(
  {
    // One plan per student
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    startDate: { type: String, required: true, maxlength: 10 },
    targetDate: { type: String, required: true, maxlength: 10 },
    minutesPerDay: { type: Number, default: 60 },
    minutesByWeekday: { type: [Number], default: [] }, // 7 numbers, Monday first
    capped: { type: Boolean, default: false },
    howItWorks: { type: [String], default: [] },
    needsData: { type: Boolean, default: false },
    message: { type: String, default: "", maxlength: 400 },
    days: { type: [PlanDaySchema], default: [] },
    leftOut: { type: [mongoose.Schema.Types.Mixed], default: [] },
    summary: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudyPlan", StudyPlanSchema);