const express = require("express");
const requireAuth = require("../middleware/auth.middleware");
const { createReport } = require("../controllers/questionReport.controller");

const router = express.Router();

router.post("/", requireAuth, createReport);

module.exports = router;