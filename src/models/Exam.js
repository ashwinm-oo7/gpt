// models/Exam.js
import mongoose from "mongoose";

const examSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    domain: { type: String, required: true },
    level: { type: Number, required: true },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    answers: [
      {
        questionId: { type: mongoose.Schema.Types.ObjectId, ref: "MCQ" },
        selectedAnswer: String,
        isCorrect: Boolean,
      },
    ],
    score: { type: Number, default: 0 },
    submitted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const Exam = mongoose.model("Exam", examSchema);
export default Exam;
