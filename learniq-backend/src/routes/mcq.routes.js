const express = require("express");
const axios = require("axios");
const requireAuth = require("../middleware/auth.middleware");
const { createLimiter } = require("../middleware/rateLimit");
const { saveMCQSet, getMyMCQSets, getMyMCQSet } = require("../controllers/mcq.controller");

const router = express.Router();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";
const MAX_QUESTIONS = 25;

// Every quiz made here uses the free AI quota, so one student cannot use it all up.
const generateLimit = createLimiter({
  name: "mcq-generate",
  perMinute: 5,
  perDay: 50,
  message: "You have made many quizzes today. Please try again tomorrow.",
});

// History routes. "/mine" must stay above "/:id".
router.get("/mine", requireAuth, getMyMCQSets);
router.get("/:id", requireAuth, getMyMCQSet);

router.post("/generate", requireAuth, generateLimit, async (req, res) => {
  const {
    mode = "text", // "text" (paragraph / PDF) or "syllabus"
    sourceFileName,
    topicName,
    topicText,
    board = "",
    level = "",
    subject = "",
    chapter = "",
    extra = "",
    numQuestions = 5,
    difficulty = "Medium",
    questionType = "Mixed",
    explanationStyle = "Short",
  } = req.body;

  const count = Math.max(1, Math.min(Number(numQuestions) || 5, MAX_QUESTIONS));

  let displayName;
  let sourceName;

  if (mode === "syllabus") {
    if (!subject.trim()) {
      return res.status(400).json({ error: "Please enter a subject" });
    }
    displayName = chapter.trim() ? `${subject.trim()} - ${chapter.trim()}` : subject.trim();
    sourceName = `syllabus-${subject.trim()}`;
  } else {
    if (!sourceFileName || !topicName || !topicText) {
      return res
        .status(400)
        .json({ error: "sourceFileName, topicName, and topicText are required" });
    }
    displayName = topicName;
    sourceName = sourceFileName;
  }

  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/api/mcq/generate`,
      {
        mode,
        topic_name: topicName || "",
        topic_text: topicText || "",
        board,
        level,
        subject,
        chapter,
        extra,
        num_questions: count,
        difficulty,
        question_type: questionType,
        explanation_style: explanationStyle,
      },
      { timeout: 120000 }
    );

    const mcqs = response.data.mcqs;

    // Saving the set is a bonus. If it fails, the student still gets the quiz.
    let quizId = null;
    try {
      const saved = await saveMCQSet({
        user: req.user.id,
        sourceFileName: sourceName,
        topicName: displayName,
        difficulty,
        numQuestions: count,
        questionType,
        explanationStyle,
        mode,
        mcqs,
      });
      quizId = saved._id;
    } catch (saveErr) {
      console.error("[mcq] Could not save MCQ set:", saveErr.message);
    }

    res.json({
      source: "freshly_generated",
      quizId,
      topicName: displayName,
      mcqs,
    });
  } catch (err) {
    const status = err.response?.status;
    const detail = err.response?.data?.detail || err.message;
    console.error("[mcq] Error:", status, detail);

    if (status === 503) {
      return res
        .status(503)
        .json({ error: "The AI is busy right now. Please click Generate again in a few seconds." });
    }
    if (status === 400) {
      return res.status(400).json({ error: detail });
    }
    res.status(502).json({ error: "Could not generate questions. Please try again.", details: detail });
  }
});

module.exports = router;