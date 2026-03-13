// routes/exam.js
import express from "express";
const router = express.Router();
import Exam from "../models/Exam.js";
import Mcq from "../models/mcq.js";
import { authMiddleware } from "../middlewares/optionalAuthMiddleware.js";

// START EXAM
router.post("/start", authMiddleware, async (req, res) => {
  try {
    const { domain, level } = req.body;
    const userId = req.user._id;

    // Check if exam already exists and not submitted
    const existing = await Exam.findOne({
      user: userId,
      domain,
      level,
      submitted: false,
    });
    if (existing) return res.json({ examId: existing._id });

    // Create new exam attempt
    const exam = new Exam({ user: userId, domain, level });
    await exam.save();

    res.json({ examId: exam._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to start exam" });
  }
});

// GET QUESTIONS FOR EXAM
router.get("/:examId", authMiddleware, async (req, res) => {
  try {
    const { examId } = req.params;
    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    const questions = await Mcq.find({
      domain: exam.domain,
      level: exam.level,
    }).sort("step");
    res.json({
      examId: exam._id,
      domain: exam.domain,
      level: exam.level,
      questions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch questions" });
  }
});

// SUBMIT EXAM
router.post("/submit/:examId", authMiddleware, async (req, res) => {
  try {
    const { examId } = req.params;
    const { answers } = req.body; // { questionId: "A", ... }

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    // Prevent double submission
    if (exam.submitted) {
      return res.json({
        message: "Exam already submitted",
        score: exam.score,
      });
    }

    // Calculate score
    const questions = await Mcq.find({
      domain: exam.domain,
      level: exam.level,
    });
    let score = 0;
    const answerRecords = questions.map((q) => {
      const selected = answers[q._id] || null;
      const isCorrect = selected === q.correctAnswer;
      if (isCorrect) score++;
      return { questionId: q._id, selectedAnswer: selected, isCorrect };
    });

    const updatedExam = await Exam.findOneAndUpdate(
      { _id: examId, submitted: false }, // prevents double submit
      {
        answers: answerRecords,
        score,
        submitted: true,
        endTime: new Date(),
      },
      { new: true },
    );

    if (!updatedExam) {
      return res.json({ message: "Exam already submitted" });
    }

    res.json({
      message: "Exam submitted",
      score,
      answers: answerRecords,
    });
  } catch (err) {
    console.error("Error subnitting", err);
    res.status(500).json({ message: "Failed to submit exam" });
  }
});
// --- AUTOSAVE EXAM ---
router.post("/autosave/:examId", authMiddleware, async (req, res) => {
  try {
    const { examId } = req.params;
    const { answers, timeLeft } = req.body; // answers: { questionId: "A", ... }

    // Find the exam, only if it's not submitted
    const exam = await Exam.findOne({ _id: examId, submitted: false });
    if (!exam) {
      return res
        .status(404)
        .json({ message: "Exam not found or already submitted" });
    }

    // Update answers partially (don't calculate score yet)
    const answerRecords = Object.entries(answers).map(
      ([questionId, selected]) => ({
        questionId,
        selectedAnswer: selected,
        isCorrect: null, // we'll calculate correctness on final submit
      }),
    );

    // Merge with existing saved answers
    const updatedAnswersMap = {};
    exam.answers.forEach(
      (a) => (updatedAnswersMap[a.questionId.toString()] = a),
    );
    answerRecords.forEach((a) => (updatedAnswersMap[a.questionId] = a));

    exam.answers = Object.values(updatedAnswersMap);
    exam.endTime = new Date(Date.now() + timeLeft * 1000); // optional: track remaining time

    await exam.save();

    res.json({ message: "Exam autosaved", savedAt: new Date() });
  } catch (err) {
    console.error("Autosave failed", err);
    res.status(500).json({ message: "Failed to autosave exam" });
  }
});
export default router;
