const express = require("express");
const router = express.Router();
const Activity = require("../models/Activity");
const requireAuth = require("../middleware/auth.middleware");

// Allowed activity types.
// counts = true means it is a FINISHED thing and counts toward the Daily Goal.
const TYPES = {
  quiz_generated: { counts: false },
  quiz_completed: { counts: true },
  notes_created: { counts: true },
  summary_created: { counts: true },
  plan_created: { counts: true },
  assignment_done: { counts: true },
  material_uploaded: { counts: false },
};

// GET /api/activities/me?limit=10 - recent activities for the logged in user
router.get("/me", requireAuth, async (req, res) => {
  try {
    let limit = parseInt(req.query.limit, 10);
    if (!Number.isInteger(limit) || limit < 1) limit = 10;
    if (limit > 50) limit = 50;

    const activities = await Activity.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/activities - log a new activity
router.post("/", requireAuth, async (req, res) => {
  try {
    const { type, title, description, link } = req.body;

    if (!type || !title) {
      return res.status(400).json({ error: "Type and title are required" });
    }
    if (!Object.prototype.hasOwnProperty.call(TYPES, type)) {
      return res.status(400).json({ error: "Unknown activity type" });
    }

    const activity = await Activity.create({
      userId: req.user.id,
      type,
      title: String(title).slice(0, 120),
      description: String(description || "").slice(0, 300),
      link: String(link || "").slice(0, 200),
      countsForGoal: TYPES[type].counts,
    });
    res.status(201).json(activity);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;