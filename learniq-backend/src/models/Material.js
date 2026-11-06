const mongoose = require("mongoose");

// One section of a PDF (a heading and the text under it)
const sectionSchema = new mongoose.Schema(
  {
    heading: { type: String, required: true },
    content: { type: String, required: true },
  },
  { _id: false }
);

// A PDF the student uploaded once. We keep only the extracted text, not the file itself.
const materialSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    fileName: { type: String, default: "" },
    sections: { type: [sectionSchema], default: [] },
    totalChars: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Material", materialSchema);