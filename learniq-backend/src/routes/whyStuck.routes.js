const express = require("express");
const axios = require("axios");
const requireAuth = require("../middleware/auth.middleware");
const QuizAttempt = require("../models/QuizAttempt");

const router = express.Router();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

// The logged-in student's own saved attempts.
// Retry attempts ARE counted, so a wrong first try plus a wrong retry shows a weak spot.
router.get("/me", requireAuth, async (req, res) => {
  try {
    // Take the newest 1000 attempts...
    const newestFirst = await QuizAttempt.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    // Map subtopic/topic to the most recent materialId and cleanTopic
    const materialMap = {};
    for (const a of newestFirst) {
      const key = `${a.topic}:::${a.subtopic}`;
      if (a.materialId && !materialMap[key]) {
        materialMap[key] = {
          materialId: a.materialId,
          cleanTopic: a.cleanTopic || a.topic,
        };
      }
    }

    // ...then flip them to oldest first, so the analysis can see improvement over time
    const attempts = newestFirst.reverse();

    const payload = attempts.map((a) => ({
      topic: a.cleanTopic || a.topic,
      subtopic: a.subtopic,
      material_id: a.materialId ? String(a.materialId) : null,
      is_correct: !!a.isCorrect,
      hints_used: a.hintsUsed || 0,
      time_taken_seconds: a.timeTakenSeconds || 0,
    }));

    const response = await axios.post(
      `${AI_SERVICE_URL}/api/why-stuck/analyze-attempts`,
      { attempts: payload },
      { timeout: 20000 }
    );

    const data = response.data || {};

    // Attach materialId & cleanTopic back to subtopic breakdowns if found in attempts
    if (Array.isArray(data.topics)) {
      data.topics.forEach((t) => {
        if (Array.isArray(t.subtopic_breakdown)) {
          t.subtopic_breakdown.forEach((s) => {
            const match = materialMap[`${t.topic}:::${s.subtopic}`];
            if (match) {
              s.materialId = match.materialId;
              s.cleanTopic = match.cleanTopic;
            }
          });
        }
      });
    }

    res.json(data);
  } catch (err) {
    console.error("[why-stuck] /me failed:", err.message);
    res.status(502).json({
      error: "Could not analyze your attempts right now",
      details: err.message,
    });
  }
});

module.exports = router;