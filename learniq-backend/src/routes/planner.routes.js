const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const requireAuth = require("../middleware/auth.middleware");
const { createLimiter } = require("../middleware/rateLimit");
const QuizAttempt = require("../models/QuizAttempt");
const StudyPlan = require("../models/StudyPlan");

const router = express.Router();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

const MAX_DAYS = 31;
const MAX_TASKS_PER_DAY = 30;
const MAX_TASKS_TOTAL = 250;
const MAX_MANUAL_TOPICS = 10;
const TYPES = ["learn", "practice", "retest", "revision", "custom"];
const PRIORITIES = ["high", "medium", "low"];

// Making or updating a plan reads up to 1000 quiz attempts and calls the AI service twice.
// /build and /me/refresh share one limit, so spamming the button cannot overload the server.
const planLimit = createLimiter({
  name: "planner",
  perMinute: 5,
  perDay: 40,
  message: "You have rebuilt your plan many times today. Please try again tomorrow.",
});

// ---------------------------------------------------------------------------
// Small helpers (everything from the browser is cleaned before it is saved)
// ---------------------------------------------------------------------------

function str(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

// "YYYY-MM-DD" and a real calendar date (no 2026-02-31)
function isRealDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function toDateOrNull(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function newId() {
  return `m-${crypto.randomBytes(4).toString("hex")}`;
}

// Request format: { "0": 30, "6": 0 } (Monday = 0, 0 minutes = rest day)
function cleanWeekdayObject(obj) {
  const out = {};
  if (!obj || typeof obj !== "object") return out;
  for (let i = 0; i < 7; i++) {
    if (obj[String(i)] === undefined) continue;
    const n = Math.round(Number(obj[String(i)]));
    if (Number.isFinite(n)) out[String(i)] = Math.min(240, Math.max(0, n));
  }
  return out;
}

// Saved format: a list of 7 numbers, or an empty list
function cleanWeekdayArray(arr) {
  if (!Array.isArray(arr) || arr.length !== 7) return [];
  return arr.map((n) => {
    const v = Math.round(Number(n));
    return Number.isFinite(v) ? Math.min(240, Math.max(0, v)) : 0;
  });
}

// Saved list of 7 numbers -> request object { "0": 30, ... }
function weekdayArrayToObject(arr) {
  const out = {};
  if (!Array.isArray(arr) || arr.length !== 7) return out;
  arr.forEach((n, i) => {
    out[String(i)] = n;
  });
  return out;
}

function cleanTask(t, usedIds) {
  if (!t || typeof t !== "object") return null;
  const title = str(t.title, 120);
  if (!title) return null;

  let id = str(t.id, 40);
  if (!id || usedIds.has(id)) id = newId();
  usedIds.add(id);

  const done = t.done === true;
  const minutes = Math.min(240, Math.max(5, Math.round(Number(t.minutes)) || 15));

  return {
    id,
    type: TYPES.includes(t.type) ? t.type : "custom",
    title,
    minutes,
    topic: str(t.topic, 120),
    subtopic: str(t.subtopic, 120),
    reason: str(t.reason, 300),
    priority: PRIORITIES.includes(t.priority) ? t.priority : "medium",
    done,
    doneAt: done ? toDateOrNull(t.doneAt) || new Date() : null,
    remindAt: toDateOrNull(t.remindAt),
    source: t.source === "manual" ? "manual" : "engine",
  };
}

// Returns { days } or { error }
function cleanDays(rawDays) {
  if (!Array.isArray(rawDays)) return { error: "The plan days are missing." };
  if (rawDays.length === 0 || rawDays.length > MAX_DAYS) {
    return { error: `A plan needs 1 to ${MAX_DAYS} days.` };
  }

  const usedIds = new Set();
  let total = 0;
  const days = [];

  for (let i = 0; i < rawDays.length; i++) {
    const d = rawDays[i] || {};
    const date = str(d.date, 10);
    if (!isRealDate(date)) return { error: `Day ${i + 1} has a bad date.` };

    const rawTasks = Array.isArray(d.tasks) ? d.tasks : [];
    if (rawTasks.length > MAX_TASKS_PER_DAY) {
      return { error: `A day can have at most ${MAX_TASKS_PER_DAY} tasks.` };
    }

    const tasks = [];
    for (const raw of rawTasks) {
      const task = cleanTask(raw, usedIds);
      if (!task) continue;
      total += 1;
      if (total > MAX_TASKS_TOTAL) {
        return { error: `A plan can have at most ${MAX_TASKS_TOTAL} tasks.` };
      }
      tasks.push(task);
    }

    days.push({
      index: i,
      date,
      label: str(d.label, 20) || `Day ${i + 1}`,
      weekday: str(d.weekday, 10),
      capacity: Math.min(1440, Math.max(0, Math.round(Number(d.capacity)) || 0)),
      rest: d.rest === true,
      tasks,
    });
  }

  return { days };
}

function summarize(days) {
  const subtopics = new Set();
  let tasks = 0;
  let minutes = 0;
  days.forEach((d) =>
    d.tasks.forEach((t) => {
      tasks += 1;
      minutes += t.minutes;
      if (t.topic || t.subtopic) subtopics.add(`${t.topic}||${t.subtopic}`);
    })
  );
  return { subtopics_planned: subtopics.size, total_tasks: tasks, total_minutes: minutes };
}

// What the browser gets back (no user id, no database internals)
function publicPlan(p) {
  if (!p) return null;
  return {
    startDate: p.startDate,
    targetDate: p.targetDate,
    minutesPerDay: p.minutesPerDay,
    minutesByWeekday: p.minutesByWeekday || [],
    capped: !!p.capped,
    howItWorks: p.howItWorks || [],
    needsData: !!p.needsData,
    message: p.message || "",
    days: p.days || [],
    leftOut: p.leftOut || [],
    summary: p.summary || {},
    updatedAt: p.updatedAt,
  };
}

// The student's weak subtopics, found the same way as the Why Am I Stuck? page
async function loadWeakTopics(userId) {
  const newestFirst = await QuizAttempt.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(1000)
    .lean();
  const attempts = newestFirst.reverse(); // oldest first
  if (attempts.length === 0) return [];

  const payload = attempts.map((a) => ({
    topic: a.topic,
    subtopic: a.subtopic,
    is_correct: !!a.isCorrect,
    hints_used: a.hintsUsed || 0,
    time_taken_seconds: a.timeTakenSeconds || 0,
  }));

  const response = await axios.post(
    `${AI_SERVICE_URL}/api/why-stuck/analyze-attempts`,
    { attempts: payload },
    { timeout: 20000 }
  );
  return (response.data && response.data.weak_subtopics) || [];
}

// Topics the student typed by hand: [{topic, subtopic}] -> engine items
function cleanManualTopics(raw) {
  const manual = [];
  if (!Array.isArray(raw)) return manual;
  for (const m of raw.slice(0, MAX_MANUAL_TOPICS)) {
    const topic = str(m && m.topic, 120);
    if (!topic) continue;
    manual.push({ topic, subtopic: str(m && m.subtopic, 120) || topic, accuracy: null });
  }
  return manual;
}

// Weak topics first, typed topics after them, no duplicates
function mergeItems(weak, manual) {
  const seen = new Set(weak.map((w) => `${w.topic}||${w.subtopic}`));
  const items = [...weak];
  for (const m of manual) {
    const key = `${m.topic}||${m.subtopic}`;
    if (!seen.has(key)) {
      seen.add(key);
      items.push(m);
    }
  }
  return items;
}

// Asks the ai-service engine for a plan. Returns { plan } or { status, error }
async function callEngine(items, startDate, targetDate, minutesPerDay, byWeekday) {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/api/planner/build`,
      {
        items,
        start_date: startDate,
        target_date: targetDate,
        minutes_per_day: minutesPerDay,
        minutes_by_weekday: byWeekday && Object.keys(byWeekday).length ? byWeekday : null,
      },
      { timeout: 20000 }
    );
    return { plan: response.data };
  } catch (err) {
    const status = err.response && err.response.status;
    const detail = err.response && err.response.data && err.response.data.detail;
    // The engine writes friendly messages (bad date, exam date in the past, all rest days...)
    if (status === 400 && typeof detail === "string") {
      return { status: 400, error: detail };
    }
    console.error("[planner] engine call failed:", status, detail || err.message);
    return { status: 502, error: "Could not build your plan right now. Please try again." };
  }
}

// ---------------------------------------------------------------------------
// GET /api/planner/me - my saved plan (or null)
// ---------------------------------------------------------------------------
router.get("/me", requireAuth, async (req, res) => {
  try {
    const plan = await StudyPlan.findOne({ user: req.user.id }).lean();
    res.json({ plan: publicPlan(plan) });
  } catch (err) {
    console.error("[planner] get failed:", err.message);
    res.status(500).json({ error: "Could not load your plan" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/planner/build - make a new plan (replaces the old one)
// Body: { startDate, targetDate, minutesPerDay, minutesByWeekday,
//         useWeak, selectedWeak: [{topic, subtopic}], manualTopics: [{topic, subtopic}] }
// ---------------------------------------------------------------------------
router.post("/build", requireAuth, planLimit, async (req, res) => {
  const body = req.body || {};

  const startDate = str(body.startDate, 10);
  const targetDate = str(body.targetDate, 10);
  if (!isRealDate(startDate) || !isRealDate(targetDate)) {
    return res.status(400).json({ error: "Please pick a valid exam date." });
  }

  let minutesPerDay = Math.round(Number(body.minutesPerDay));
  if (!Number.isFinite(minutesPerDay)) minutesPerDay = 60;
  minutesPerDay = Math.min(240, Math.max(15, minutesPerDay));

  const byWeekday = cleanWeekdayObject(body.minutesByWeekday);
  const manual = cleanManualTopics(body.manualTopics);

  // Weak topics from the student's real quiz attempts
  let weak = [];
  if (body.useWeak !== false) {
    try {
      weak = await loadWeakTopics(req.user.id);
    } catch (err) {
      console.error("[planner] could not load weak topics:", err.message);
      if (manual.length === 0) {
        return res
          .status(502)
          .json({ error: "Could not load your weak topics right now. Please try again." });
      }
    }
  }

  // If the student ticked only some weak topics, keep just those
  if (Array.isArray(body.selectedWeak)) {
    const keep = new Set(
      body.selectedWeak.map((s) => `${str(s && s.topic, 120)}||${str(s && s.subtopic, 120)}`)
    );
    weak = weak.filter((w) => keep.has(`${w.topic}||${w.subtopic}`));
  }

  const items = mergeItems(weak, manual);

  const out = await callEngine(items, startDate, targetDate, minutesPerDay, byWeekday);
  if (out.error) return res.status(out.status).json({ error: out.error });
  const plan = out.plan;

  const cleaned = cleanDays(plan && plan.days);
  if (cleaned.error) {
    console.error("[planner] engine sent a bad plan:", cleaned.error);
    return res.status(502).json({ error: "Could not build your plan right now. Please try again." });
  }

  try {
    const saved = await StudyPlan.findOneAndUpdate(
      { user: req.user.id },
      {
        $set: {
          startDate: str(plan.start_date, 10) || startDate,
          targetDate: str(plan.target_date, 10) || targetDate,
          minutesPerDay: Math.round(Number(plan.minutes_per_day)) || minutesPerDay,
          minutesByWeekday: cleanWeekdayArray(plan.minutes_by_weekday),
          capped: plan.capped === true,
          howItWorks: Array.isArray(plan.how_it_works)
            ? plan.how_it_works.slice(0, 10).map((s) => str(s, 300))
            : [],
          needsData: plan.needs_data === true,
          message: str(plan.message, 400),
          days: cleaned.days,
          leftOut: Array.isArray(plan.left_out) ? plan.left_out.slice(0, 50) : [],
          summary: summarize(cleaned.days),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    res.json({ plan: publicPlan(saved) });
  } catch (err) {
    console.error("[planner] save failed:", err.message);
    res.status(500).json({ error: "Could not save your plan. Please try again." });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/planner/me - save my edited plan. Body: { days }
// ---------------------------------------------------------------------------
router.put("/me", requireAuth, async (req, res) => {
  try {
    const existing = await StudyPlan.findOne({ user: req.user.id }).select("_id").lean();
    if (!existing) {
      return res.status(404).json({ error: "You do not have a plan yet." });
    }

    const cleaned = cleanDays(req.body && req.body.days);
    if (cleaned.error) {
      return res.status(400).json({ error: cleaned.error });
    }

    const summary = summarize(cleaned.days);
    const set = { days: cleaned.days, summary };
    if (summary.total_tasks > 0) set.needsData = false;

    const saved = await StudyPlan.findOneAndUpdate(
      { user: req.user.id },
      { $set: set },
      { new: true }
    ).lean();

    res.json({ plan: publicPlan(saved) });
  } catch (err) {
    console.error("[planner] update failed:", err.message);
    res.status(500).json({ error: "Could not save your changes. Please try again." });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/planner/me - remove my plan
// ---------------------------------------------------------------------------
router.delete("/me", requireAuth, async (req, res) => {
  try {
    await StudyPlan.deleteOne({ user: req.user.id });
    res.json({ ok: true });
  } catch (err) {
    console.error("[planner] delete failed:", err.message);
    res.status(500).json({ error: "Could not delete your plan" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/planner/me/shift-missed - move undone tasks from past days forward.
// Body: { today: "YYYY-MM-DD" } (sent by the browser, so no timezone problems)
// A task only moves to an upcoming study day that has enough free time.
// If nothing fits, the task stays where it is.
// ---------------------------------------------------------------------------
router.post("/me/shift-missed", requireAuth, async (req, res) => {
  try {
    const today = str(req.body && req.body.today, 10);
    if (!isRealDate(today)) {
      return res.status(400).json({ error: "Today's date is missing." });
    }

    const plan = await StudyPlan.findOne({ user: req.user.id }).lean();
    if (!plan) return res.status(404).json({ error: "You do not have a plan yet." });

    const days = plan.days || [];
    const used = days.map((d) => d.tasks.reduce((sum, t) => sum + (t.minutes || 0), 0));

    let moved = 0;
    let notMoved = 0;

    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      if (day.date >= today) continue; // only past days have missed tasks

      const stay = [];
      for (const t of day.tasks) {
        if (t.done) {
          stay.push(t);
          continue;
        }

        // First upcoming study day with enough free time
        let target = -1;
        for (let j = 0; j < days.length; j++) {
          const up = days[j];
          if (up.date < today || up.rest || !(up.capacity > 0)) continue;
          if (used[j] + t.minutes <= up.capacity) {
            target = j;
            break;
          }
        }

        if (target === -1) {
          stay.push(t);
          notMoved += 1;
          continue;
        }

        used[target] += t.minutes;
        used[i] -= t.minutes;

        const movedTask = {
          ...t,
          remindAt: null, // the old reminder time is in the past
          reason: `Moved from ${day.label} (${day.date}). ${t.reason || ""}`.trim().slice(0, 300),
        };

        // Keep the final revision task last on its day
        const list = days[target].tasks;
        const revisionAt = list.findIndex((x) => x.type === "revision");
        if (revisionAt === -1) list.push(movedTask);
        else list.splice(revisionAt, 0, movedTask);

        moved += 1;
      }
      day.tasks = stay;
    }

    if (moved === 0) {
      // Nothing changed, so there is nothing to save
      return res.json({ plan: publicPlan(plan), moved: 0, notMoved });
    }

    const cleaned = cleanDays(days);
    if (cleaned.error) {
      return res.status(400).json({ error: cleaned.error });
    }

    const saved = await StudyPlan.findOneAndUpdate(
      { user: req.user.id },
      { $set: { days: cleaned.days, summary: summarize(cleaned.days) } },
      { new: true }
    ).lean();

    res.json({ plan: publicPlan(saved), moved, notMoved });
  } catch (err) {
    console.error("[planner] shift-missed failed:", err.message);
    res.status(500).json({ error: "Could not move your missed tasks. Please try again." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/planner/me/refresh - "Update my plan".
// Rebuilds the days from today to the exam date with the LATEST weak topics.
// It KEEPS: all past days, every task already ticked done, every task the
// student added by hand. It REPLACES: the undone auto-made tasks from today on.
// Body: { today: "YYYY-MM-DD", manualTopics?: [{topic, subtopic}] }
// ---------------------------------------------------------------------------
router.post("/me/refresh", requireAuth, planLimit, async (req, res) => {
  try {
    const body = req.body || {};
    const today = str(body.today, 10);
    if (!isRealDate(today)) {
      return res.status(400).json({ error: "Today's date is missing." });
    }

    const plan = await StudyPlan.findOne({ user: req.user.id }).lean();
    if (!plan) return res.status(404).json({ error: "You do not have a plan yet." });

    if (today > plan.targetDate) {
      return res
        .status(400)
        .json({ error: "Your exam date has passed. Please make a new plan." });
    }

    // The new part of the plan starts today (or at the old start, if that is later)
    const newStart = today > plan.startDate ? today : plan.startDate;

    let weak = [];
    try {
      weak = await loadWeakTopics(req.user.id);
    } catch (err) {
      console.error("[planner] refresh: could not load weak topics:", err.message);
      return res
        .status(502)
        .json({ error: "Could not load your weak topics right now. Please try again." });
    }

    const items = mergeItems(weak, cleanManualTopics(body.manualTopics));
    if (items.length === 0) {
      return res.status(400).json({
        error:
          "You have no weak topics right now, so there is nothing new to plan. Your plan was not changed.",
      });
    }

    const out = await callEngine(
      items,
      newStart,
      plan.targetDate,
      plan.minutesPerDay,
      weekdayArrayToObject(plan.minutesByWeekday)
    );
    if (out.error) return res.status(out.status).json({ error: out.error });
    const fresh = out.plan;

    const freshDays = Array.isArray(fresh && fresh.days) ? fresh.days : [];
    const freshByDate = new Map(freshDays.map((d) => [d.date, d]));

    // Build the combined list of days, in date order
    const combined = [];

    for (const old of plan.days) {
      if (old.date < newStart) {
        // Past days stay exactly as they were
        combined.push({ ...old });
        continue;
      }

      // From the new start on: keep done tasks and the student's own tasks...
      const kept = old.tasks.filter((t) => t.done || t.source === "manual");
      const freshDay = freshByDate.get(old.date);
      const freshTasks = freshDay ? freshDay.tasks || [] : [];

      combined.push({
        ...old,
        // use the engine's day info when it has it (capacity, rest day)
        capacity: freshDay ? freshDay.capacity : old.capacity,
        rest: freshDay ? freshDay.rest : old.rest,
        // ...and put them FIRST so they keep their ids, then the new engine tasks
        tasks: [...kept, ...freshTasks],
      });
    }

    // Re-number the days and labels
    combined.forEach((d, i) => {
      d.index = i;
      d.label = `Day ${i + 1}`;
    });

    const cleaned = cleanDays(combined);
    if (cleaned.error) {
      console.error("[planner] refresh made a bad plan:", cleaned.error);
      return res.status(502).json({ error: "Could not update your plan right now. Please try again." });
    }

    const saved = await StudyPlan.findOneAndUpdate(
      { user: req.user.id },
      {
        $set: {
          capped: fresh.capped === true,
          howItWorks: Array.isArray(fresh.how_it_works)
            ? fresh.how_it_works.slice(0, 10).map((s) => str(s, 300))
            : plan.howItWorks || [],
          needsData: false,
          message: str(fresh.message, 400),
          days: cleaned.days,
          leftOut: Array.isArray(fresh.left_out) ? fresh.left_out.slice(0, 50) : [],
          summary: summarize(cleaned.days),
        },
      },
      { new: true }
    ).lean();

    res.json({ plan: publicPlan(saved), topicsPlanned: items.length });
  } catch (err) {
    console.error("[planner] refresh failed:", err.message);
    res.status(500).json({ error: "Could not update your plan. Please try again." });
  }
});

module.exports = router;