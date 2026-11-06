const express = require("express");
const { signup, login } = require("../controllers/auth.controller");
const { createAttemptLimiter } = require("../middleware/rateLimit");

const router = express.Router();

const clientIp = (req) => req.ip || "unknown";
const typedName = (req) =>
  String((req.body && req.body.username) || "")
    .trim()
    .toLowerCase()
    .slice(0, 50);

// Same IP + same user name: 10 wrong tries per 15 minutes
const loginPerAccount = createAttemptLimiter({
  name: "login-account",
  max: 10,
  windowMinutes: 15,
  keyFn: (req) => `${clientIp(req)}|${typedName(req)}`,
  countFailuresOnly: true,
  message: "Too many wrong tries for this account. Please wait a few minutes and try again.",
});

// Same IP, any user name: 60 wrong tries per 15 minutes.
// This is high on purpose, so a whole classroom on one WiFi is not locked out.
const loginPerIp = createAttemptLimiter({
  name: "login-ip",
  max: 60,
  windowMinutes: 15,
  keyFn: clientIp,
  countFailuresOnly: true,
  message: "Too many login tries from this network. Please wait a few minutes and try again.",
});

// Signup: 30 new accounts per hour from one IP
const signupPerIp = createAttemptLimiter({
  name: "signup-ip",
  max: 30,
  windowMinutes: 60,
  keyFn: clientIp,
  message: "Too many accounts were created from this network. Please try again in a while.",
});

router.post("/signup", signupPerIp, signup);
router.post("/login", loginPerIp, loginPerAccount, login);

module.exports = router;