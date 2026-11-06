const express = require("express");
const mongoose = require("mongoose");
const requireAuth = require("../middleware/auth.middleware");

const router = express.Router();
router.use(requireAuth);

// Helper to safely get registered Mongoose models
function getModel(name) {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
}

router.get("/", async (req, res) => {
  try {
    const User = getModel("User");
    const QuizAttempt = getModel("QuizAttempt");
    const Task = getModel("Task");

    // 1. Fetch all registered users
    const allUsers = User
      ? await User.find({}).select("name username avatar createdAt").lean()
      : [];

    // 2. Aggregate Quiz Attempts by User (if model exists)
    let quizStats = [];
    if (QuizAttempt) {
      try {
        quizStats = await QuizAttempt.aggregate([
          {
            $group: {
              _id: "$user",
              totalAttempts: { $sum: 1 },
              correctAnswers: {
                $sum: {
                  $cond: [{ $eq: ["$selectedAnswer", "$correctAnswer"] }, 1, 0],
                },
              },
            },
          },
        ]);
      } catch (err) {
        console.warn("[leaderboard] QuizAttempt aggregate fallback:", err.message);
      }
    }

    // 3. Aggregate Completed Tasks by User (if model exists)
    let taskStats = [];
    if (Task) {
      try {
        taskStats = await Task.aggregate([
          { $match: { done: true } },
          {
            $group: {
              _id: "$user",
              tasksCompleted: { $sum: 1 },
            },
          },
        ]);
      } catch (err) {
        console.warn("[leaderboard] Task aggregate fallback:", err.message);
      }
    }

    // Build lookup maps
    const quizMap = new Map();
    quizStats.forEach((q) => {
      if (q && q._id) quizMap.set(String(q._id), q);
    });

    const taskMap = new Map();
    taskStats.forEach((t) => {
      if (t && t._id) taskMap.set(String(t._id), t.tasksCompleted);
    });

    // 4. Build leaderboard array
    const currentUserId = String(req.user?.id || req.user?._id || "");
    const leaderboard = allUsers.map((u) => {
      const uid = String(u._id);
      const q = quizMap.get(uid) || { totalAttempts: 0, correctAnswers: 0 };
      const tasksDone = taskMap.get(uid) || 0;

      // Real XP Calculation: 10 XP per attempt, 15 XP bonus per correct, 30 XP per task
      const quizXp = q.totalAttempts * 10 + q.correctAnswers * 15;
      const taskXp = tasksDone * 30;
      const totalXp = quizXp + taskXp;

      const accuracy = q.totalAttempts > 0
        ? Math.round((q.correctAnswers / q.totalAttempts) * 100)
        : 0;

      const streak = Math.max(1, Math.min(14, Math.floor(totalXp / 120)));

      let title = "Apprentice Scholar";
      if (totalXp >= 1000) title = "Master Scholar";
      else if (totalXp >= 500) title = "Quiz Champion";
      else if (totalXp >= 250) title = "Consistent Learner";
      else if (totalXp >= 100) title = "Sprint Master";

      return {
        userId: u._id,
        name: u.name || u.username || "Student",
        avatar: u.avatar || "🦉",
        xp: totalXp,
        totalAttempts: q.totalAttempts,
        correctAnswers: q.correctAnswers,
        accuracy,
        tasksDone,
        streak,
        title,
        isUser: uid === currentUserId,
      };
    });

    // 5. Sort descending by XP
    leaderboard.sort((a, b) => b.xp - a.xp);

    const ranked = leaderboard.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    return res.json({
      leaderboard: ranked,
      totalLearners: ranked.length,
    });
  } catch (err) {
    console.error("[leaderboard] error:", err);
    return res.status(500).json({ error: "Failed to compute leaderboard" });
  }
});

module.exports = router;