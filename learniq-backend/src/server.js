// 1. Force Google DNS bypass for Atlas SRV resolution
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// 2. Initialize Express
const app = express();

// Behind a host proxy (Render, Railway, Vercel...) every visitor would look like ONE IP,
// and the per-IP login limits would count everybody together. On the host set the env
// variable TRUST_PROXY=1. Leave it unset on your own computer (nothing can fake an IP then).
if (process.env.TRUST_PROXY) {
  const value = process.env.TRUST_PROXY;
  app.set("trust proxy", /^\d+$/.test(value) ? Number(value) : value);
}

// 3. Global Middlewares
app.use(cors());

// Only the AI Teacher route may receive a picture, so only it gets a big body limit.
// This must come BEFORE the global parser below. The route checks the picture itself
// (about 8 million characters) and sends a friendly message; the 10 MB here is a hard
// stop just above that.
app.use("/api/assistant", express.json({ limit: "10mb" }));

// Everything else is small JSON. File uploads use multer, so they are not affected.
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ limit: "2mb", extended: true }));

// 4. Mount application routes.
// If a route file cannot load, the server still starts, so the error is printed loudly.
const mountRoute = (path, routeModulePath) => {
  try {
    app.use(path, require(routeModulePath));
  } catch (err) {
    console.error(`[route-ERROR] Could not load ${routeModulePath}:`, err.message);
  }
};

mountRoute("/api/auth", "./routes/auth.routes");
mountRoute("/api/activities", "./routes/activity.routes");
mountRoute("/api/settings", "./routes/settings.routes");
mountRoute("/api/quiz-attempts", "./routes/quizAttempt.routes");
mountRoute("/api/assistant", "./routes/assistant.routes");
mountRoute("/api/planner", "./routes/planner.routes");
mountRoute("/api/tasks", "./routes/tasks.routes");
mountRoute("/api/notes", "./routes/notes.routes");
mountRoute("/api/materials", "./routes/materials.routes");
mountRoute("/api/mcq", "./routes/mcq.routes");
mountRoute("/api/pdf", "./routes/pdf.routes");
mountRoute("/api/question-report", "./routes/questionReport.routes");
mountRoute("/api/question-reports", "./routes/questionReport.routes");
mountRoute("/api/why-stuck", "./routes/whyStuck.routes");
mountRoute("/api/leaderboard", "./routes/leaderboard.routes");

// 5. Login check for the in-file user endpoints.
const requireAuth = require("./middleware/auth.middleware");

// Resolves existing User model from models/User.js if already loaded, else requires or creates it
const getUserModel = () => {
  try {
    return mongoose.model("User");
  } catch {
    try {
      return require("./models/User");
    } catch {
      const UserSchema = new mongoose.Schema(
        {
          name: { type: String, default: "Student" },
          email: { type: String, required: true, unique: true },
          passwordHash: { type: String },
          password: { type: String },
          avatar: { type: String, default: "🦉" },
          boardOrUni: { type: String, default: "" },
          gradeOrYear: { type: String, default: "" },
          targetExam: { type: String, default: "" },
        },
        { timestamps: true }
      );
      return mongoose.model("User", UserSchema);
    }
  }
};

// User Profile, Email, and Password Endpoints
app.put("/api/users/profile", requireAuth, async (req, res) => {
  try {
    const UserModel = getUserModel();
    const userId = req.user?.id || req.user?._id;
    const { name, avatar, boardOrUni, gradeOrYear, targetExam } = req.body;

    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found." });

    if (name !== undefined) user.name = String(name).trim();
    if (avatar !== undefined) user.avatar = avatar;
    if (boardOrUni !== undefined) user.boardOrUni = String(boardOrUni).trim();
    if (gradeOrYear !== undefined) user.gradeOrYear = String(gradeOrYear).trim();
    if (targetExam !== undefined) user.targetExam = String(targetExam).trim();

    await user.save();

    // Never send the password or hash back to the browser
    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.passwordHash;
    return res.json({ success: true, user: safeUser });
  } catch (err) {
    console.error("[users] profile update error:", err.message);
    return res.status(500).json({ error: "Failed to update profile. Please try again." });
  }
});

app.put("/api/users/email", requireAuth, async (req, res) => {
  try {
    const UserModel = getUserModel();
    const userId = req.user?.id || req.user?._id;
    const { email, password } = req.body;

    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail || !password) {
      return res.status(400).json({ error: "Email and current password are required." });
    }

    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found." });

    const currentHash = user.passwordHash || user.password;
    if (!currentHash) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }

    const valid = await bcrypt.compare(String(password), currentHash);
    if (!valid) return res.status(401).json({ error: "Current password is incorrect." });

    const exists = await UserModel.findOne({ email: cleanEmail });
    if (exists && exists._id.toString() !== user._id.toString()) {
      return res.status(400).json({ error: "Email already taken by another account." });
    }

    user.email = cleanEmail;
    await user.save();
    return res.json({ success: true, email: user.email });
  } catch (err) {
    console.error("[users] email update error:", err.message);
    return res.status(500).json({ error: "Failed to update email. Please try again." });
  }
});

app.put("/api/users/password", requireAuth, async (req, res) => {
  try {
    const UserModel = getUserModel();
    const userId = req.user?.id || req.user?._id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "Both passwords are required." });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found." });

    const currentHash = user.passwordHash || user.password;
    if (!currentHash) {
      return res.status(401).json({ error: "Current password does not match." });
    }

    const match = await bcrypt.compare(String(oldPassword), currentHash);
    if (!match) return res.status(401).json({ error: "Current password does not match." });

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(String(newPassword), salt);

    // Save into passwordHash (and update legacy password if present)
    user.passwordHash = newHash;
    if (user.password !== undefined) {
      user.password = newHash;
    }

    await user.save();

    return res.json({ success: true, message: "Password updated successfully!" });
  } catch (err) {
    console.error("[users] password update error:", err.message);
    return res.status(500).json({ error: "Failed to update password. Please try again." });
  }
});

// 6. Error handler (must be AFTER all routes).
// Without it, a too-big request makes Express send an HTML page, and the website
// cannot show that as a message. This always answers with JSON { error }.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err && err.type === "entity.too.large") {
    return res
      .status(413)
      .json({ error: "That is too much data to send at once. Please send something smaller." });
  }
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "The request could not be read. Please try again." });
  }

  console.error("[server] Unhandled error:", err && err.message);
  const status = err && Number.isInteger(err.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
  return res.status(status).json({ error: "Something went wrong on the server. Please try again." });
});

// 7. Database Connection & Server Start
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("[db] Connected to MongoDB Atlas successfully");
    app.listen(PORT, () => {
      console.log(`[server] Backend running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("[db] MongoDB connection error:", err.message);
  });