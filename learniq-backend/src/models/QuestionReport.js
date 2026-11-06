
const mongoose = require("mongoose");

const questionReportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    topic: { type: String, required: true },
    subtopic: { type: String, default: "" },
    question: { type: String, required: true },
    options: { type: [String], default: [] },
    correctAnswer: { type: String, required: true },
    selectedAnswer: { type: String, default: "" },
    explanation: { type: String, default: "" },
    reason: {
      type: String,
      enum: ["wrong_answer", "unclear_question", "bad_explanation", "other"],
      required: true,
    },
    note: { type: String, default: "", maxlength: 500 },
    status: { type: String, enum: ["open", "reviewed"], default: "open" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("QuestionReport", questionReportSchema);