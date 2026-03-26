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
    // console.log("Domains", domains);
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
    // console.log("Get results", exam, questions);
    res.json({
      exam,
      questions,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get(
  "/analytics/summary",
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const totalAttempts = await Exam.countDocuments({ submitted: true });

      const avgScoreAgg = await Exam.aggregate([
        { $match: { submitted: true } },
        { $group: { _id: null, avgScore: { $avg: "$score" } } },
      ]);

      const avgScore = avgScoreAgg[0]?.avgScore || 0;

      const domainStats = await Exam.aggregate([
        { $match: { submitted: true } },
        {
          $group: {
            _id: "$domain",
            count: { $sum: 1 },
          },
        },
      ]);

      res.json({
        totalAttempts,
        avgScore: Math.round(avgScore),
        domainStats,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to load analytics" });
    }
  },
);
export default router;
