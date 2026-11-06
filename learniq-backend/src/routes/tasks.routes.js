const express = require("express");
const mongoose = require("mongoose");
const requireAuth = require("../middleware/auth.middleware");
const Task = require("../models/Task");
const Activity = require("../models/Activity");

const router = express.Router();

const MAX_TASKS = 200;
const MAX_SUBTASKS = 20;
const PRIORITIES = ["high", "medium", "low"];
const LINK_TYPES = ["", "practice", "notes"];
const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Helpers (everything from the browser is cleaned before it is saved)
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

function cleanSubtasks(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const s of raw.slice(0, MAX_SUBTASKS)) {
    const title = str(s && s.title, 120);
    if (!title) continue;
    const item = { title, done: !!(s && s.done === true) };
    if (s && s.id && mongoose.isValidObjectId(s.id)) item._id = s.id;
    out.push(item);
  }
  return out;
}

// Turns the request body into clean fields. Only fields that were sent are returned,
// so the same function works for a new task and for a partial edit.
function cleanFields(body) {
  const out = {};
  if (body.title !== undefined) out.title = str(body.title, 120);
  if (body.notes !== undefined) out.notes = str(body.notes, 500);
  if (body.tag !== undefined) out.tag = str(body.tag, 40);
  if (body.priority !== undefined) {
    out.priority = PRIORITIES.includes(body.priority) ? body.priority : "medium";
  }
  if (body.dueDate !== undefined) {
    out.dueDate = isRealDate(body.dueDate) ? body.dueDate : "";
  }
  if (body.remindAt !== undefined) out.remindAt = toDateOrNull(body.remindAt);
  if (body.repeat !== undefined) out.repeat = body.repeat === "daily" ? "daily" : "none";
  if (body.subtasks !== undefined) out.subtasks = cleanSubtasks(body.subtasks);
  if (body.planTaskId !== undefined) out.planTaskId = str(body.planTaskId, 40);
  if (body.source !== undefined) out.source = body.source === "planner" ? "planner" : "manual";
  if (body.link !== undefined) {
    const l = body.link && typeof body.link === "object" ? body.link : {};
    out.link = {
      type: LINK_TYPES.includes(l.type) ? l.type : "",
      topic: str(l.topic, 120),
      subtopic: str(l.subtopic, 120),
    };
  }
  if (body.focusMinutes !== undefined) {
    const n = Math.round(Number(body.focusMinutes));
    out.focusMinutes = Number.isFinite(n) ? Math.min(100000, Math.max(0, n)) : 0;
  }
  return out;
}

// What the browser gets back (no user id, no database internals)
function publicTask(t) {
  return {
    id: t._id,
    title: t.title,
    notes: t.notes || "",
    priority: t.priority,
    tag: t.tag || "",
    dueDate: t.dueDate || "",
    remindAt: t.remindAt || null,
    repeat: t.repeat || "none",
    done: !!t.done,
    doneAt: t.doneAt || null,
    source: t.source,
    planTaskId: t.planTaskId || "",
    link: t.link || { type: "", topic: "", subtopic: "" },
    subtasks: (t.subtasks || []).map((s) => ({ id: s._id, title: s.title, done: !!s.done })),
    focusMinutes: t.focusMinutes || 0,
    createdAt: t.createdAt,
  };
}

// Open tasks first, then by due date (no date = last), then newest first
function sortTasks(list) {
  return list.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const da = a.dueDate || "9999-99-99";
    const db = b.dueDate || "9999-99-99";
    if (da !== db) return da < db ? -1 : 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

function findOwned(req) {
  if (!mongoose.isValidObjectId(req.params.id)) return null;
  return Task.findOne({ _id: req.params.id, user: req.user.id });
}

// ---------------------------------------------------------------------------
// GET /api/tasks - all my tasks
// ---------------------------------------------------------------------------
router.get("/", requireAuth, async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user.id }).limit(MAX_TASKS + 50).lean();
    res.json({ tasks: sortTasks(tasks.map(publicTask)) });
  } catch (err) {
    console.error("[tasks] list failed:", err.message);
    res.status(500).json({ error: "Could not load your tasks" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/tasks - add a task (with duplicate prevention for planTaskId)
// ---------------------------------------------------------------------------
router.post("/", requireAuth, async (req, res) => {
  try {
    const fields = cleanFields(req.body || {});
    if (!fields.title) {
      return res.status(400).json({ error: "Please give your task a title." });
    }

    // Deduplication check: if coming from the study planner, return the existing task
    if (fields.planTaskId) {
      const existing = await Task.findOne({ user: req.user.id, planTaskId: fields.planTaskId });
      if (existing) {
        return res.json({ task: publicTask(existing.toObject()) });
      }
    }

    const count = await Task.countDocuments({ user: req.user.id });
    if (count >= MAX_TASKS) {
      return res
        .status(400)
        .json({ error: `You have ${MAX_TASKS} tasks already. Please delete some first.` });
    }

    const task = await Task.create({ ...fields, user: req.user.id });
    res.status(201).json({ task: publicTask(task.toObject()) });
  } catch (err) {
    console.error("[tasks] create failed:", err.message);
    res.status(500).json({ error: "Could not add your task. Please try again." });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/tasks/:id - edit a task (send only the fields that changed)
// ---------------------------------------------------------------------------
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const task = await findOwned(req);
    if (!task) return res.status(404).json({ error: "Task not found" });

    const body = req.body || {};
    const fields = cleanFields(body);

    if (fields.title !== undefined && !fields.title) {
      return res.status(400).json({ error: "The title cannot be empty." });
    }

    const wasDone = task.done;
    const hadDoneAt = !!task.doneAt;

    Object.assign(task, fields);

    if (body.done !== undefined) {
      task.done = body.done === true;
      // doneAt keeps the FIRST time it was finished (so re-ticking never counts twice)
      if (task.done && !task.doneAt) task.doneAt = new Date();
    }

    await task.save();

    // First finish only: log it so it counts toward the Daily Goal
    if (!wasDone && task.done && !hadDoneAt) {
      try {
        await Activity.create({
          userId: req.user.id,
          type: "assignment_done",
          title: `Finished task: ${task.title}`.slice(0, 120),
          description: task.tag ? `Subject: ${task.tag}` : "",
          link: "/assignments",
          countsForGoal: true,
        });
      } catch (err) {
        console.error("[tasks] could not log activity:", err.message);
      }
    }

    res.json({ task: publicTask(task.toObject()) });
  } catch (err) {
    console.error("[tasks] update failed:", err.message);
    res.status(500).json({ error: "Could not save your changes. Please try again." });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/tasks/:id
// ---------------------------------------------------------------------------
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: "Task not found" });
    }
    const out = await Task.deleteOne({ _id: req.params.id, user: req.user.id });
    if (out.deletedCount === 0) return res.status(404).json({ error: "Task not found" });
    res.json({ ok: true });
  } catch (err) {
    console.error("[tasks] delete failed:", err.message);
    res.status(500).json({ error: "Could not delete your task" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/tasks/:id/ack - a reminder was shown.
// ---------------------------------------------------------------------------
router.post("/:id/ack", requireAuth, async (req, res) => {
  try {
    const task = await findOwned(req);
    if (!task) return res.status(404).json({ error: "Task not found" });

    const now = Date.now();
    const snooze = Math.round(Number(req.body && req.body.snoozeMinutes));

    if (Number.isFinite(snooze) && snooze > 0) {
      const minutes = Math.min(1440, snooze);
      task.remindAt = new Date(now + minutes * 60 * 1000);
    } else if (task.repeat === "daily" && task.remindAt) {
      let next = task.remindAt.getTime();
      if (next <= now) {
        const k = Math.floor((now - next) / DAY_MS) + 1;
        next += k * DAY_MS;
      }
      task.remindAt = new Date(next);
    } else {
      task.remindAt = null;
    }

    await task.save();
    res.json({ task: publicTask(task.toObject()) });
  } catch (err) {
    console.error("[tasks] ack failed:", err.message);
    res.status(500).json({ error: "Could not update the reminder" });
  }
});

module.exports = router;