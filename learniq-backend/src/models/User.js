const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["student", "teacher", "parent"],
      default: "student",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);