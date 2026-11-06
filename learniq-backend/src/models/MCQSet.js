const mongoose = require("mongoose");

const mcqItemSchema = new mongoose.Schema({
  question: String,
  options: [String],
  correct_answer: String,
  explanation: String,
  subtopic: String,
  hint: String,
  // Where in the student's material the answer is found (checked by the AI service)
  source_heading: { type: String, default: "" },
  source_quote: { type: String, default: "" },
});

const mcqSetSchema = new mongoose.Schema(
  {
    // user is optional so old saved sets (made before this change) still load
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    sourceFileName: { type: String, required: true },
    topicName: { type: String, required: true },
    difficulty: { type: String, required: true },
    numQuestions: { type: Number, required: true },
    questionType: { type: String, default: "Mixed" },
    explanationStyle: { type: String, default: "Short" },
    mode: { type: String, default: "text" }, // "text" or "syllabus"
    mcqs: [mcqItemSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("MCQSet", mcqSetSchema);