const mongoose = require("mongoose");
const MCQSet = require("../models/MCQSet");

async function findCachedMCQSet(sourceFileName, topicName, difficulty, numQuestions) {
  return await MCQSet.findOne({ sourceFileName, topicName, difficulty, numQuestions });
}

async function saveMCQSet({
  user,
  sourceFileName,
  topicName,
  difficulty,
  numQuestions,
  questionType,
  explanationStyle,
  mode,
  mcqs,
}) {
  const mcqSet = new MCQSet({
    user,
    sourceFileName,
    topicName,
    difficulty,
    numQuestions,
    questionType,
    explanationStyle,
    mode,
    mcqs,
  });
  return await mcqSet.save();
}

// List of my quizzes (without the questions, so it stays light)
async function getMyMCQSets(req, res) {
  try {
    const sets = await MCQSet.find({ user: req.user.id })
      .select("-mcqs")
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(sets);
  } catch (err) {
    res.status(500).json({ error: "Could not load your quizzes", details: err.message });
  }
}

// One of my quizzes, with all questions
async function getMyMCQSet(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid quiz id" });
    }
    const set = await MCQSet.findOne({ _id: req.params.id, user: req.user.id });
    if (!set) return res.status(404).json({ error: "Quiz not found" });
    res.json(set);
  } catch (err) {
    res.status(500).json({ error: "Could not load the quiz", details: err.message });
  }
}

module.exports = { findCachedMCQSet, saveMCQSet, getMyMCQSets, getMyMCQSet };