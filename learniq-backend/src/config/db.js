const dns = require("dns");
const mongoose = require("mongoose");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;