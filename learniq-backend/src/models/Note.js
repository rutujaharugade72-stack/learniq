const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    sourceFileName: {
      type: String,
      required: true,
    },
    topicName: {
      type: String,
      required: true,
    },
    rawText: {
      type: String,
      required: true,
    },
    generatedNotes: {
      type: String,
      required: true,
    },
  },
  { timestamps: true } // adds createdAt / updatedAt automatically
);

module.exports = mongoose.model("Note", noteSchema);