require("dotenv").config();
const mongoose = require("mongoose");
const MCQSet = require("./src/models/MCQSet");

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);

  const mcqSet = new MCQSet({
    sourceFileName: "Unit3.pdf",
    topicName: "Black Box Testing",
    difficulty: "Easy",
    numQuestions: 2,
    mcqs: [
      {
        question: "TEST QUESTION: What does black-box testing focus on?",
        options: ["A. Internal code", "B. Functionality based on specs", "C. Memory usage", "D. Compiler errors"],
        correct_answer: "B",
        explanation: "This is a test explanation for cache verification.",
      },
    ],
  });

  await mcqSet.save();
  console.log("Test MCQ set saved successfully!");

  await mongoose.disconnect();
}

seed();