// routes/exam.js
import express from "express";
const router = express.Router();
import Exam from "../models/Exam.js";
import Mcq from "../models/mcq.js";
import {
  adminOnly,
  authMiddleware,
} from "../middlewares/optionalAuthMiddleware.js";
import PDFDocument from "pdfkit";
import crypto from "crypto";
import QRCode from "qrcode";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import path from "path";
const certLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
});
import fs from "fs";
import { downloadCertificateService } from "../services/certificateService.js";
const certificateTemplate = path.resolve("src/assets/certificate-template.png");
const signatureImage = path.resolve("src/assets/signature.png");
const sealImage = path.resolve("src/assets/seal.png");
router.get("/badges", authMiddleware, async (req, res) => {
  try {
    const badges = await Exam.find({
      user: req.user._id,
      certificateEligible: true,
    })
      .select("domain level")
      .lean();

    res.status(200).json({
      success: true,
      data: badges || [],
    });
  } catch (error) {
    console.error("Badges error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch badges",
    });
  }
});
router.get("/leaderboard/:domain", async (req, res) => {
  const users = await Exam.find({
    domain: req.params.domain,
    certificateEligible: true,
  })
    .populate("user", "email")
    .sort({ percentage: -1 })
    .limit(20);

  res.json(users);
});
// START EXAM
router.post("/start", authMiddleware, async (req, res) => {
  try {
    const { domain, level } = req.body;
    const userId = req.user._id;
    const attempts = await Exam.countDocuments({
      user: userId,
      domain,
      level,
      submitted: true,
    });

    if (attempts >= 5) {
      return res.status(403).json({
        message: "Maximum attempts reached for this level",
      });
    }
    // Check if exam already exists and not submitted
    const existing = await Exam.findOne({
      user: userId,
      domain,
      level,
      submitted: false,
    });
    if (existing) return res.json({ examId: existing._id });
    console.log("userids", userId);
    // Create new exam attempt
    const questions = await Mcq.aggregate([
      { $match: { domain, level } },
      { $sample: { size: 25 } },
    ]);
    if (questions.length === 0) {
      return res.status(400).json({
        message: "No questions available for this exam",
      });
    }

    const exam = new Exam({
      user: userId,
      domain,
      level,
      questions: questions.map((q) => q._id),
    });
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
    if (!mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({
        message: "Invalid exam ID",
      });
    }

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    // const questions = await Mcq.aggregate([
    //   {
    //     $match: {
    //       domain: exam.domain,
    //       level: exam.level,
    //     },
    //   },
    //   { $sample: { size: 25 } },
    // ]);
    const questions = await Mcq.find({
      _id: { $in: exam.questions },
    });

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
    // const questions = await Mcq.find({
    //   domain: exam.domain,
    //   level: exam.level,
    // });
    const questions = await Mcq.find({
      _id: { $in: exam.questions },
    });
    const totalQuestions = questions.length;
    let score = 0;
    const answerRecords = questions.map((q) => {
      const selected = answers[q._id] || null;
      const isCorrect = selected === q.correctAnswer;
      if (isCorrect) score++;
      return { questionId: q._id, selectedAnswer: selected, isCorrect };
    });
    const percentage = Math.round((score / totalQuestions) * 100);
    const certificateEligible = exam.level >= 1 && percentage >= 80;
    const updatedExam = await Exam.findOneAndUpdate(
      { _id: examId, submitted: false }, // prevents double submit
      {
        answers: answerRecords,
        score,
        percentage,
        certificateEligible,
        certificateId: certificateEligible
          ? `${exam.domain}-L${exam.level}-${crypto
              .randomBytes(3)
              .toString("hex")}`
          : null,

        submitted: true,
        endTime: new Date(),
        certificateIssuedAt: certificateEligible ? new Date() : null,
      },
      { new: true },
    );

    if (!updatedExam) {
      return res.json({ message: "Exam already submitted" });
    }
    // Emit notification to all connected admins
    io.emit("newExamAttempt", {
      message: `${exam.user?.name || "A user"} submitted an exam in ${
        exam.domain
      } Level ${exam.level}`,
      examId: exam._id,
      createdAt: new Date(),
    });

    res.json({
      message: "Exam submitted",
      score,
      percentage,
      certificateEligible,
      answers: answerRecords,
    });
  } catch (err) {
    console.error("Error subnitting", err);
    res.status(500).json({ message: "Failed to submit exam" });
  }
});

router.get(
  "/certificateWAIT/download/:domain/:level",
  certLimiter,
  authMiddleware,
  async (req, res) => {
    try {
      const level = Number(req.params.level);

      if (!req.params.domain || isNaN(level)) {
        return res.status(400).json({
          message: "Invalid certificate request",
        });
      }
      const exam = await Exam.findOne({
        user: req.user._id,
        domain: req.params.domain,
        level: Number(req.params.level),
        certificateEligible: true,
      });

      if (!exam) {
        return res.status(403).json({ message: "Certificate not available" });
      }

      const verifyUrl = `${process.env.FRONTEND_URL}/verify/${exam.certificateId}`;

      const qrImage = await QRCode.toDataURL(verifyUrl);

      const doc = new PDFDocument({
        size: "A4",
        layout: "landscape",
      });

      res.setHeader(
        "Content-Disposition",
        `attachment; filename=certificate-${exam.domain}-L${exam.level}.pdf`,
      );

      res.setHeader("Content-Type", "application/pdf");
      doc.image(certificateTemplate, 0, 0, { width: 842 });
      doc.image(signatureImage, 620, 420, { width: 120 });
      doc.image(sealImage, 380, 350, { width: 90 });
      if (
        !fs.existsSync(certificateTemplate) ||
        !fs.existsSync(signatureImage) ||
        !fs.existsSync(sealImage)
      ) {
        console.error("Certificate assets missing");

        return res.status(500).json({
          message: "Certificate assets not found",
        });
      }
      doc.pipe(res);

      doc.fontSize(32).text("Certificate of Achievement", { align: "center" });

      doc.moveDown();

      doc.fontSize(20).text(`This certifies that`, { align: "center" });

      doc.moveDown();

      doc.fontSize(26).text(`${req.user.email}`, { align: "center" });

      doc.moveDown();

      doc.text(`Completed ${exam.domain} Level ${exam.level}`, {
        align: "center",
      });

      doc.moveDown();

      doc.text(`Score: ${exam.percentage}%`, { align: "center" });

      doc.text(`Certificate ID: ${exam.certificateId}`, { align: "center" });

      doc.image(qrImage, 650, 350, { width: 100 });

      doc.end();
    } catch (err) {
      console.error("Certificate generation failed:", err);

      return res.status(500).json({
        message: "Failed to generate certificate",
      });
    }
  },
);
router.get("/verify/:certificateId", async (req, res) => {
  const exam = await Exam.findOne({
    certificateId: req.params.certificateId,
  }).populate("user", "email");

  if (!exam) {
    return res.status(404).json({
      valid: false,
    });
  }
  const hash = crypto
    .createHash("sha256")
    .update(exam.certificateId + exam.user._id)
    .digest("hex");

  res.json({
    valid: true,
    user: exam.user.email,
    domain: exam.domain,
    level: exam.level,
    score: exam.percentage,
    issuedAt: exam.certificateIssuedAt,
    blockchainHash: hash,
  });
});

router.get(
  "/exam/my-certificates",
  certLimiter,
  authMiddleware,
  async (req, res) => {
    console.log("my-certificates", req.userId);
    try {
      // 1️⃣ Validate authenticated user
      if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
        return res.status(400).json({
          message: "Invalid User",
        });
      }

      if (!req.user || !req.user._id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized access",
        });
      }

      const userId = req.user._id;

      // 2️⃣ Fetch certificates
      const certificates = await Exam.find({
        user: userId,
        certificateEligible: true,
      })
        .select("domain level percentage certificateId certificateIssuedAt")
        .sort({ certificateIssuedAt: -1 })
        .lean();

      // 3️⃣ Handle empty result
      if (!certificates || certificates.length === 0) {
        return res.status(200).json({
          success: true,
          message: "No certificates found",
          data: [],
        });
      }

      // 4️⃣ Success response
      return res.status(200).json({
        success: true,
        count: certificates.length,
        data: certificates,
      });
    } catch (error) {
      console.error("Fetch certificates error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch certificates",
      });
    }
  },
);
// --- AUTOSAVE EXAM ---
router.post("/autosave/:examId", authMiddleware, async (req, res) => {
  try {
    const { examId } = req.params;
    const { answers, timeLeft } = req.body; // answers: { questionId: "A", ... }
    console.log("autosave/:examId", examId);
    // Find the exam, only if it's not submitted
    if (!mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ message: "Invalid examId" });
    }

    // const examObjectId = new mongoose.Types.ObjectId(examId);

    const exam = await Exam.findById(examId);

    if (!exam) {
      return res.status(404).json({
        message: "Exam not found",
      });
    }

    if (exam.submitted) {
      return res.status(400).json({
        message: "Exam already submitted",
      });
    }
    console.log("exams", exam);
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
router.get("/attempt/:examId", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { examId } = req.params;

    const exam = await Exam.findById(examId).populate("user", "name email");

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    const questions = await Mcq.find({
      domain: exam.domain,
      level: exam.level,
    }).sort("step");

    res.json({
      exam,
      questions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load attempt" });
  }
});

router.get(
  "/certificate/download/:domain/:level",
  certLimiter,
  authMiddleware,
  downloadCertificateService,
);
export default router;
