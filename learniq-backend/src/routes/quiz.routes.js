const express = require("express");
const axios = require("axios");

const router = express.Router();

const AI_SERVICE_URL = "http://127.0.0.1:8000";

router.post("/next-difficulty", async (req, res) => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/api/quiz/next-difficulty`,
      req.body
    );
    res.json(response.data);
  } catch (err) {
    console.error("[quiz] AI service call failed:", err.message);
    res.status(502).json({
      error: "Could not reach AI service",
      details: err.message,
    });
  }
});

module.exports = router;