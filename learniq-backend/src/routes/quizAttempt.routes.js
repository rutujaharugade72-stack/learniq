const express = require("express");
const requireAuth = require("../middleware/auth.middleware");
const { saveAttempt, getMyAttempts } = require("../controllers/quizAttempt.controller");

const router = express.Router();

router.post("/", requireAuth, saveAttempt);
router.get("/me", requireAuth, getMyAttempts);

module.exports = router;