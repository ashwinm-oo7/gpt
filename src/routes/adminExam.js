import express from "express";
import Exam from "../models/Exam.js";
import Mcq from "../models/mcq.js";
// import User from "../models/user.js";
import {
  authMiddleware,
  adminOnly,
} from "../middlewares/optionalAuthMiddleware.js";

const router = express.Router();

// GET domains where exams exist
router.get("/domains", authMiddleware, adminOnly, async (req, res) => {
  try {
    const domains = await Exam.distinct("domain");
    res.json(domains);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET levels inside domain
router.get("/levels/:domain", authMiddleware, adminOnly, async (req, res) => {
  try {
    const levels = await Exam.find({ domain: req.params.domain }).distinct(
      "level",
    );

    res.json(levels);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET exam attempts
router.get("/attempts", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { domain, level } = req.query;

    const exams = await Exam.find({
      domain,
      level,
    })
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json(exams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET exam detail
router.get("/attempt/:examId", authMiddleware, adminOnly, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId).populate(
      "user",
      "name email",
    );

    const questions = await Mcq.find({
      domain: exam.domain,
      level: exam.level,
    });
    console.log("Get results", exam, questions);
    res.json({
      exam,
      questions,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
