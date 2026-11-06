const QuestionReport = require("../models/QuestionReport");

const REASONS = ["wrong_answer", "unclear_question", "bad_explanation", "other"];

async function createReport(req, res) {
  try {
    const {
      topic,
      subtopic = "",
      question,
      options = [],
      correctAnswer,
      selectedAnswer = "",
      explanation = "",
      reason,
      note = "",
    } = req.body;

    if (!topic || !question || !correctAnswer || !reason) {
      return res.status(400).json({
        message: "topic, question, correctAnswer and reason are required",
      });
    }
    if (!REASONS.includes(reason)) {
      return res.status(400).json({ message: "Invalid reason" });
    }

    const report = await QuestionReport.create({
      user: req.user.id,
      topic,
      subtopic,
      question,
      options: Array.isArray(options) ? options : [],
      correctAnswer,
      selectedAnswer,
      explanation,
      reason,
      note: String(note).slice(0, 500),
    });

    res.status(201).json({ message: "Report saved", id: report._id });
  } catch (err) {
    res.status(500).json({ message: "Failed to save report", error: err.message });
  }
}

module.exports = { createReport };