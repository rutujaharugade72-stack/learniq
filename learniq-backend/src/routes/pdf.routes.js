const express = require("express");
const axios = require("axios");
const multer = require("multer");
const FormData = require("form-data");
const requireAuth = require("../middleware/auth.middleware");
const { createLimiter } = require("../middleware/rateLimit");

const router = express.Router();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";
const MAX_FILE_MB = 10;

// Reading a file makes the server work hard, so one student cannot spam uploads.
// It runs BEFORE the file is read, so a blocked request costs almost nothing.
const uploadLimit = createLimiter({
  name: "pdf-upload",
  perMinute: 6,
  perDay: 60,
  message: "You uploaded many files today. Please try again tomorrow.",
});

// Store the uploaded file in memory temporarily (fine for small files)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024 },
});

// Runs multer, and turns its errors (like "file too big") into a friendly message
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

// Login first, then the limit, then the file
router.post("/upload", requireAuth, uploadLimit, receiveFile, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    // Re-package the file as multipart/form-data to forward to Python
    const formData = new FormData();
    formData.append("file", req.file.buffer, req.file.originalname);

    const response = await axios.post(`${AI_SERVICE_URL}/api/pdf/upload`, formData, {
      headers: formData.getHeaders(),
      maxBodyLength: Infinity,
      timeout: 90000,
    });

    res.json(response.data);
  } catch (err) {
    console.error("[pdf] AI service call failed:", err.message);
    const detail =
      err.response && err.response.data && (err.response.data.detail || err.response.data.error);
    res.status(502).json({
      error: detail ? String(detail) : "Could not read this file right now. Please try again.",
    });
  }
});

module.exports = router;