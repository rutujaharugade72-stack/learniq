const mongoose = require("mongoose");

const UserSettingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    dailyGoalQuestions: { type: Number, default: 10 }, // Target questions per day
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserSetting", UserSettingSchema);