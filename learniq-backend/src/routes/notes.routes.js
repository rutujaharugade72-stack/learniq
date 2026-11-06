const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const requireAuth = require("../middleware/auth.middleware");
const SavedNote = require("../models/SavedNote");
const Material = require("../models/Material");

const router = express.Router();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

// ---------------------------------------------------------------------------
// Authenticated Notes + Summarizer
// ---------------------------------------------------------------------------

const MAX_AI_CHARS = 12000; // the AI service reads at most this much text
const MIN_TEXT_CHARS = 50;
const MAX_SAVED_NOTES = 30; // per student; the oldest one is removed after that

const LEVELS = {
  notes: ["Brief", "Standard", "Detailed"],
  summary: ["Short", "Medium", "Detailed"],
};
const DEFAULT_LEVEL = { notes: "Standard", summary: "Medium" };

// Rate limit per student, to protect the free AI quota.
// It lives in memory, so it resets when the backend restarts.
const PER_MINUTE = 4;
const PER_DAY = 40;
const hits = new Map(); // userId -> list of timestamps (ms)

function checkLimit(userId) {
  const now = Date.now();
  const recent = (hits.get(userId) || []).filter((t) => t > now - 24 * 60 * 60 * 1000);

  const lastMinute = recent.filter((t) => t > now - 60 * 1000).length;
  if (lastMinute >= PER_MINUTE) {
    hits.set(userId, recent);
    return { ok: false, message: "You are going too fast. Please wait a minute and try again." };
  }
  if (recent.length >= PER_DAY) {
    hits.set(userId, recent);
    return { ok: false, message: "You reached today's limit. Please try again tomorrow." };
  }

  recent.push(now);
  hits.set(userId, recent);
  return { ok: true };
}

// Joins the chosen sections of a material into one text, up to MAX_AI_CHARS
function buildTextFromMaterial(material, sectionIndexes) {
  const all = material.sections || [];
  let chosen = all;

  if (Array.isArray(sectionIndexes) && sectionIndexes.length > 0) {
    const wanted = new Set(
      sectionIndexes.filter((i) => Number.isInteger(i) && i >= 0 && i < all.length)
    );
    chosen = all.filter((_, i) => wanted.has(i));
  }

  let text = "";
  let truncated = false;
  for (const s of chosen) {
    const block = `${s.heading}\n${s.content}`;
    const joined = text ? `${text}\n\n${block}` : block;
    if (joined.length > MAX_AI_CHARS) {
      const room = MAX_AI_CHARS - text.length - (text ? 2 : 0);
      if (room > 200) text = text ? `${text}\n\n${block.slice(0, room)}` : block.slice(0, room);
      truncated = true;
      break;
    }
    text = joined;
  }
  return { text, truncated };
}

// Make notes or a summary. Body: { mode, level, title, materialId?, sectionIndexes?, text? }
router.post("/study", requireAuth, async (req, res) => {
  const body = req.body || {};

  const mode = body.mode === "notes" || body.mode === "summary" ? body.mode : null;
  if (!mode) {
    return res.status(400).json({ error: "Please choose Notes or Summary." });
  }
  const level = LEVELS[mode].includes(body.level) ? body.level : DEFAULT_LEVEL[mode];
  const givenTitle = typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";

  let text = "";
  let truncated = false;
  let materialId = null;
  let materialTitle = "";

  try {
    if (body.materialId) {
      if (!mongoose.isValidObjectId(body.materialId)) {
        return res.status(404).json({ error: "Material not found" });
      }
      // Only the student's OWN materials can be used
      const material = await Material.findOne({ _id: body.materialId, user: req.user.id }).lean();
      if (!material) {
        return res.status(404).json({ error: "Material not found" });
      }
      const built = buildTextFromMaterial(material, body.sectionIndexes);
      text = built.text;
      truncated = built.truncated;
      materialId = material._id;
      materialTitle = material.title;
    } else {
      const pasted = typeof body.text === "string" ? body.text.trim() : "";
      text = pasted.slice(0, MAX_AI_CHARS);
      truncated = pasted.length > MAX_AI_CHARS;
    }
  } catch (err) {
    console.error("[notes] could not load material:", err.message);
    return res.status(500).json({ error: "Could not load your material. Please try again." });
  }

  if (text.length < MIN_TEXT_CHARS) {
    return res.status(400).json({
      error: "There is not enough text to work with. Pick a material or paste more text.",
    });
  }

  const limit = checkLimit(String(req.user.id));
  if (!limit.ok) {
    return res.status(429).json({ error: limit.message });
  }

  const title = givenTitle || materialTitle || "Pasted text";

  let result;
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/api/notes/study`,
      { mode, title, text, level },
      { timeout: 120000 }
    );
    result = (response.data && (response.data.result || response.data)) || null;
  } catch (err) {
    const status = err.response && err.response.status;
    const detail = (err.response && err.response.data && err.response.data.detail) || err.message;
    console.error("[notes] study failed:", status, detail);

    if (status === 503) {
      return res
        .status(503)
        .json({ error: "The AI is busy right now. Please try again in a few seconds." });
    }
    return res.status(502).json({ error: "Could not make your notes. Please try again." });
  }

  if (!result || typeof result !== "object") {
    return res.status(502).json({ error: "The AI sent back something unexpected. Please try again." });
  }

  truncated = truncated || Boolean(result.truncated);

  // Saving is a bonus. If it fails, the student still gets the result.
  let savedId = null;
  try {
    const count = await SavedNote.countDocuments({ user: req.user.id });
    if (count >= MAX_SAVED_NOTES) {
      const extra = count - MAX_SAVED_NOTES + 1;
      const oldest = await SavedNote.find({ user: req.user.id })
        .sort({ createdAt: 1 })
        .limit(extra)
        .select("_id")
        .lean();
      await SavedNote.deleteMany({ _id: { $in: oldest.map((o) => o._id) } });
    }
    const saved = await SavedNote.create({
      user: req.user.id,
      mode,
      level,
      title,
      materialId,
      materialTitle,
      truncated,
      result,
    });
    savedId = saved._id;
  } catch (err) {
    console.error("[notes] could not save:", err.message);
  }

  res.json({
    id: savedId,
    mode,
    level,
    title,
    materialId,
    materialTitle,
    truncated,
    result,
  });
});

// List my saved notes and summaries (no content, just the basics)
router.get("/mine", requireAuth, async (req, res) => {
  try {
    const items = await SavedNote.find({ user: req.user.id })
      .select("mode level title materialId materialTitle truncated createdAt")
      .sort({ createdAt: -1 })
      .lean();
    res.json({
      notes: items.map((n) => ({
        id: n._id,
        mode: n.mode,
        level: n.level,
        title: n.title,
        materialId: n.materialId || null,
        materialTitle: n.materialTitle,
        truncated: n.truncated,
        createdAt: n.createdAt,
      })),
    });
  } catch (err) {
    console.error("[notes] list failed:", err.message);
    res.status(500).json({ error: "Could not load your notes" });
  }
});

// Open one saved note or summary
router.get("/mine/:id", requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: "Not found" });
    }
    const n = await SavedNote.findOne({ _id: req.params.id, user: req.user.id }).lean();
    if (!n) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json({
      id: n._id,
      mode: n.mode,
      level: n.level,
      title: n.title,
      materialId: n.materialId || null,
      materialTitle: n.materialTitle,
      truncated: n.truncated,
      createdAt: n.createdAt,
      result: n.result,
    });
  } catch (err) {
    console.error("[notes] open failed:", err.message);
    res.status(500).json({ error: "Could not open this note" });
  }
});

// Delete one of my saved notes
router.delete("/mine/:id", requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: "Not found" });
    }
    const out = await SavedNote.deleteOne({ _id: req.params.id, user: req.user.id });
    if (out.deletedCount === 0) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("[notes] delete failed:", err.message);
    res.status(500).json({ error: "Could not delete this note" });
  }
});

module.exports = router;