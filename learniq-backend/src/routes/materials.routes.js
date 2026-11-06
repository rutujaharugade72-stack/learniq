const express = require("express");
const axios = require("axios");
const multer = require("multer");
const FormData = require("form-data");
const mongoose = require("mongoose");
const requireAuth = require("../middleware/auth.middleware");
const { createLimiter } = require("../middleware/rateLimit");
const Material = require("../models/Material");

const router = express.Router();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

const MAX_MATERIALS = 10; // per student, keeps the free database small
const MAX_FILE_MB = 10;
const MAX_TOTAL_CHARS = 300000; // text kept per material

// What students can upload
const DOC_EXTENSIONS = [".pdf", ".pptx", ".docx", ".txt"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];
const OLD_FORMATS = {
  ".ppt": "Old .ppt files cannot be read. Please save it as .pptx and upload again.",
  ".doc": "Old .doc files cannot be read. Please save it as .docx and upload again.",
};

// Reading a file makes the server work hard, so one student cannot spam uploads.
const uploadLimit = createLimiter({
  name: "materials-upload",
  perMinute: 6,
  perDay: 60,
  message: "You uploaded many files today. Please try again tomorrow.",
});

// Photos use the AI (Gemini) to read the text, so they get a small limit.
const PHOTOS_PER_HOUR = 15;
const photoHits = new Map();

function photoLimitOk(userId) {
  const now = Date.now();
  const recent = (photoHits.get(userId) || []).filter((t) => t > now - 60 * 60 * 1000);
  if (recent.length >= PHOTOS_PER_HOUR) {
    photoHits.set(userId, recent);
    return false;
  }
  recent.push(now);
  photoHits.set(userId, recent);
  return true;
}

function getExtension(name) {
  const match = /\.[a-z0-9]+$/i.exec(String(name || ""));
  return match ? match[0].toLowerCase() : "";
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024 },
});

router.use(requireAuth);

function receiveFile(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (err) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? `This file is too big (maximum ${MAX_FILE_MB} MB).`
          : "Could not read the upload.";
      return res.status(400).json({ error: message });
    }
    next();
  });
}

function summary(m) {
  return {
    id: m._id,
    title: m.title,
    fileName: m.fileName,
    sectionCount: m.sections.length,
    totalChars: m.totalChars,
    createdAt: m.createdAt,
  };
}

// Upload a file once: the AI service reads it, we save only the text sections
router.post("/upload", uploadLimit, receiveFile, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const ext = getExtension(req.file.originalname);
  if (OLD_FORMATS[ext]) {
    return res.status(400).json({ error: OLD_FORMATS[ext] });
  }
  const isImage = IMAGE_EXTENSIONS.includes(ext);
  if (!isImage && !DOC_EXTENSIONS.includes(ext)) {
    return res.status(400).json({
      error: "This file type is not supported. Use a PDF, PPTX, DOCX, TXT or a photo (JPG, PNG, WEBP).",
    });
  }

  try {
    const count = await Material.countDocuments({ user: req.user.id });
    if (count >= MAX_MATERIALS) {
      return res.status(400).json({
        error: `You can keep up to ${MAX_MATERIALS} materials. Delete one first.`,
      });
    }

    if (isImage && !photoLimitOk(String(req.user.id))) {
      return res.status(429).json({
        error: "You uploaded many photos in the last hour. Please try again a little later.",
      });
    }

    const formData = new FormData();
    formData.append("file", req.file.buffer, req.file.originalname);

    const response = await axios.post(`${AI_SERVICE_URL}/api/pdf/upload`, formData, {
      headers: formData.getHeaders(),
      maxBodyLength: Infinity,
      timeout: 90000,
    });

    const rawSections = Array.isArray(response.data.sections) ? response.data.sections : [];
    const sections = [];
    let total = 0;
    let truncated = false;
    for (const s of rawSections) {
      const heading = String((s && s.heading) || "").trim().slice(0, 200);
      const content = String((s && s.content) || "").trim();
      if (!heading || !content) continue;
      if (total + content.length > MAX_TOTAL_CHARS) {
        truncated = true;
        break;
      }
      sections.push({ heading, content });
      total += content.length;
    }

    if (sections.length === 0) {
      return res.status(422).json({
        error:
          ext === ".pdf"
            ? "No readable text found in this PDF. Scanned PDFs are not supported yet. Try a photo of the page instead."
            : "No readable text found in this file.",
      });
    }

    const fileName = req.file.originalname;
    const title =
      String(req.body.title || fileName.replace(/\.[a-z0-9]+$/i, "")).trim().slice(0, 120) ||
      "Untitled";

    const material = await Material.create({
      user: req.user.id,
      title,
      fileName,
      sections,
      totalChars: total,
    });

    res.status(201).json({ material: summary(material), truncated });
  } catch (err) {
    console.error("[materials] upload failed:", err.message);
    const detail =
      err.response && err.response.data && (err.response.data.detail || err.response.data.error);
    res.status(502).json({
      error: detail ? String(detail) : "Could not read this file right now. Please try again.",
      details: err.message,
    });
  }
});

// List my materials
router.get("/", async (req, res) => {
  try {
    const materials = await Material.find({ user: req.user.id })
      .select("title fileName totalChars createdAt sections.heading")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ materials: materials.map(summary) });
  } catch (err) {
    console.error("[materials] list failed:", err.message);
    res.status(500).json({ error: "Could not load your materials" });
  }
});

// Open one material
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: "Material not found" });
    }
    const material = await Material.findOne({ _id: req.params.id, user: req.user.id }).lean();
    if (!material) {
      return res.status(404).json({ error: "Material not found" });
    }
    res.json({
      id: material._id,
      title: material.title,
      fileName: material.fileName,
      sections: material.sections,
      totalChars: material.totalChars,
      createdAt: material.createdAt,
    });
  } catch (err) {
    console.error("[materials] open failed:", err.message);
    res.status(500).json({ error: "Could not open this material" });
  }
});

// Delete one of my materials
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: "Material not found" });
    }
    const result = await Material.deleteOne({ _id: req.params.id, user: req.user.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Material not found" });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("[materials] delete failed:", err.message);
    res.status(500).json({ error: "Could not delete this material" });
  }
});

module.exports = router;