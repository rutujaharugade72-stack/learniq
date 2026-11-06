const express = require("express");
const axios = require("axios");
const requireAuth = require("../middleware/auth.middleware");
const { createLimiter } = require("../middleware/rateLimit");

const router = express.Router();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

// An image arrives as text (base64). 8 million characters is about a 6 MB photo.
const MAX_IMAGE_CHARS = 8 * 1000 * 1000;
// The "details" object only carries a short description of the page the student is on
const MAX_DETAILS_CHARS = 4000;

// Each student can send 6 messages a minute and 100 a day (protects the free AI quota)
const chatLimit = createLimiter({
  name: "ai-teacher",
  perMinute: 6,
  perDay: 100,
  message: "You have used today's free AI Teacher messages. Please come back tomorrow!",
});

router.post("/chat", requireAuth, chatLimit, async (req, res) => {
  const body = req.body || {};

  const question = typeof body.question === "string" ? body.question.trim().slice(0, 3000) : "";
  // Check both 'image' and 'imagePayload'
  const image = body.image || body.imagePayload || null;

  // Student questions are private, so only the sizes are logged
  console.log(
    `[node-assistant] user ${req.user.id}: question ${question.length} chars, ` +
      `image ${image ? `yes (${String(image).length} chars)` : "no"}`
  );

  if (!question && !image) {
    return res.status(400).json({ error: "Please enter a question or upload an image." });
  }

  if (image) {
    if (typeof image !== "string") {
      return res.status(400).json({ error: "This picture could not be read. Please try another one." });
    }
    if (image.startsWith("data:") && !image.startsWith("data:image/")) {
      return res.status(400).json({ error: "Please upload a picture (JPG or PNG)." });
    }
    if (image.length > MAX_IMAGE_CHARS) {
      return res.status(413).json({
        error: "This picture is too big. Please use a smaller photo (under about 5 MB).",
      });
    }
  }

  const page = typeof body.page === "string" ? body.page.slice(0, 100) : "AI Teacher Classroom";
  const summary = typeof body.summary === "string" ? body.summary.slice(0, 600) : "";

  // Keep "details" only if it is a small object
  let details = {};
  if (body.details && typeof body.details === "object") {
    try {
      if (JSON.stringify(body.details).length <= MAX_DETAILS_CHARS) details = body.details;
    } catch {
      details = {};
    }
  }

  const history = Array.isArray(body.history)
    ? body.history.slice(-6).map((m) => ({
        role: m && m.role === "assistant" ? "assistant" : "user",
        text: String(m && m.text ? m.text : "").slice(0, 800),
      }))
    : [];

  try {
    const payload = {
      question: question || "Please examine and describe what is shown in this image in detail.",
      image: image || null,
      page,
      summary,
      details,
      history,
    };

    const response = await axios.post(`${AI_SERVICE_URL}/api/assistant/chat`, payload, {
      timeout: 90000,
      maxContentLength: 20 * 1024 * 1024,
      maxBodyLength: 20 * 1024 * 1024,
      headers: { "Content-Type": "application/json" },
    });

    return res.json({ reply: response.data.reply, mode: response.data.mode });
  } catch (err) {
    const status = err.response?.status;
    const detail = err.response?.data?.detail || err.message;
    console.error("[node-assistant] AI Service error:", status, detail);

    if (status === 503) {
      return res.status(503).json({ error: "The AI is currently busy. Please retry in a few seconds." });
    }
    return res.status(502).json({ error: "AI Teacher could not analyze this. Please try again." });
  }
});

module.exports = router;