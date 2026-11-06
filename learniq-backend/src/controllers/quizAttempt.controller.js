const QuizAttempt = require("../models/QuizAttempt");

async function saveAttempt(req, res) {
  try {
    const {
      materialId = null,
      cleanTopic = "",
      topic,
      subtopic,
      difficulty,
      question,
      selectedAnswer,
      correctAnswer,
      timeTakenSeconds,
      hintsUsed = 0,
      isRetry = false,
    } = req.body;

    if (!topic || !difficulty || !question || !selectedAnswer || !correctAnswer || timeTakenSeconds == null) {
      return res.status(400).json({
        message: "topic, difficulty, question, selectedAnswer, correctAnswer and timeTakenSeconds are required",
      });
    }

    const attempt = await QuizAttempt.create({
      user: req.user.id,
      materialId: materialId || null,
      cleanTopic: cleanTopic || "",
      topic,
      subtopic: subtopic || topic,
      difficulty,
      question,
      selectedAnswer,
      correctAnswer,
      isCorrect: selectedAnswer === correctAnswer,
      timeTakenSeconds,
      hintsUsed,
      isRetry: isRetry === true,
    });

    res.status(201).json(attempt);
  } catch (err) {
    res.status(500).json({ message: "Failed to save quiz attempt", error: err.message });
  }
}

async function getMyAttempts(req, res) {
  try {
    const attempts = await QuizAttempt.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(attempts);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch quiz attempts", error: err.message });
  }
}

module.exports = { saveAttempt, getMyAttempts };