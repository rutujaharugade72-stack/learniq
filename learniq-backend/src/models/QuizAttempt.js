const mongoose = require("mongoose");

const quizAttemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    materialId: { type: mongoose.Schema.Types.ObjectId, ref: "Material", default: null },
    cleanTopic: { type: String, default: "" },
    topic: { type: String, required: true },
    subtopic: { type: String, required: true },
    difficulty: { type: String, required: true },
    question: { type: String, required: true },
    selectedAnswer: { type: String, required: true },
    correctAnswer: { type: String, required: true },
    isCorrect: { type: Boolean, required: true },
    timeTakenSeconds: { type: Number, required: true },
    hintsUsed: { type: Number, default: 0 },
    isRetry: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("QuizAttempt", quizAttemptSchema);