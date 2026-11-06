const express = require("express");
const router = express.Router();
const UserSetting = require("../models/UserSetting");
const Activity = require("../models/Activity");
const requireAuth = require("../middleware/auth.middleware");

const DEFAULT_GOAL = 5;
const MIN_GOAL = 1;
const MAX_GOAL = 50;

// GET /api/settings - daily goal and how many goal activities were finished today
router.get("/", requireAuth, async (req, res) => {
  try {
    let setting = await UserSetting.findOne({ userId: req.user.id });
    if (!setting) {
      setting = await UserSetting.create({
        userId: req.user.id,
        dailyGoalQuestions: DEFAULT_GOAL,
      });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const doneToday = await Activity.countDocuments({
      userId: req.user.id,
      countsForGoal: true,
      createdAt: { $gte: startOfDay },
    });

    res.json({
      dailyGoal: setting.dailyGoalQuestions,
      doneToday,
      // old names, kept so nothing breaks while we update the frontend
      dailyGoalQuestions: setting.dailyGoalQuestions,
      questionsAnsweredToday: doneToday,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings - change the daily goal
router.put("/", requireAuth, async (req, res) => {
  try {
    const goal = Number(req.body.dailyGoal ?? req.body.dailyGoalQuestions);

    if (!Number.isInteger(goal) || goal < MIN_GOAL || goal > MAX_GOAL) {
      return res
        .status(400)
        .json({ error: `Goal must be a whole number from ${MIN_GOAL} to ${MAX_GOAL}` });
    }

    const setting = await UserSetting.findOneAndUpdate(
      { userId: req.user.id },
      { $set: { dailyGoalQuestions: goal } },
      { new: true, upsert: true }
    );

    res.json({
      dailyGoal: setting.dailyGoalQuestions,
      dailyGoalQuestions: setting.dailyGoalQuestions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;