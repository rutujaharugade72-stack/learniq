const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

function signToken(user) {
  return jwt.sign(
    {
      id: user._id,
      name: user.name,
      username: user.username,
      role: user.role || "student",
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    username: user.username,
    role: user.role || "student",
  };
}

async function signup(req, res) {
  try {
    // The role is NOT read from the request. Signup always makes a student account,
    // so nobody can make themselves a teacher by sending role: "teacher" directly.
    const { name, username, password } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ message: "name, username and password are required" });
    }

    const existing = await User.findOne({ username: username.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "That username is already taken" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      username,
      passwordHash,
      role: "student",
    });

    const token = signToken(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    console.error("Signup error:", err.message);
    res.status(500).json({ message: "Signup failed", error: err.message });
  }
}

async function login(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "username and password are required" });
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
}

module.exports = { signup, login };