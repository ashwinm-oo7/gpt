import express from "express";
import Mcq from "../models/mcq.js";
import {
  adminOnly,
  authMiddleware,
} from "../middlewares/optionalAuthMiddleware.js";
import multer from "multer";
import XLSX from "xlsx";
import fs from "fs";

const router = express.Router();
const upload = multer({ dest: "uploads/" });
import dotenv from "dotenv";
dotenv.config();
import { GoogleGenerativeAI } from "@google/generative-ai";
import mongoose from "mongoose";
import Exam from "../models/Exam.js";

// The client will automatically use the GEMINI_API_KEY environment variable
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post(
  "/bulk-upload",
  authMiddleware,
  adminOnly,
  upload.single("file"),
  async (req, res) => {
    let filePath;

    try {
      filePath = req.file?.path;

      if (!req.file) {
        console.error("No file uploaded");
        return res.status(400).json({ message: "No file uploaded" });
      }

      // console.log("File uploaded:", req.file.path);

      // Read the file
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet);

      if (!rows.length) {
        console.error("Excel file is empty or not formatted correctly");
        return res
          .status(400)
          .json({ message: "Excel file is empty or not formatted correctly" });
      }

      // Map rows to MCQ objects
      const formatted = rows.map((r, index) => {
        const options = [r.optionA, r.optionB, r.optionC, r.optionD];
        // Basic validation
        if (
          !r.domain ||
          !r.level ||
          !r.step ||
          !r.question ||
          options.some((o) => !o) ||
          !r.answer ||
          !r.explanation
        ) {
          throw new Error(`Invalid data at row ${index + 2}`); // +2 because Excel header is row 1
        }

        return {
          domain: r.domain,
          level: Number(r.level),
          step: Number(r.step),
          question: r.question,
          options,
          correctAnswer: r.answer,
          explanation: r.explanation,
          createdBy: req.userId, // attach admin user
        };
      });

      // console.log("Formatted MCQs:", formatted);

      // Insert into MongoDB
      await Mcq.insertMany(formatted, { ordered: true }); // stops at first duplicate or invalid

      // Delete the uploaded file
      // fs.unlinkSync(req.file.path);

      res.json({ message: "MCQs uploaded successfully" });
    } catch (err) {
      console.error("Bulk upload error:", err.message);
      res.status(500).json({
        success: false,
        message: err.message || "Bulk upload failed",
      });
    } finally {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  },
);

// ----------------------
// GET all domains
// ----------------------
router.post("/generate-ai", async (req, res) => {
  try {
    const { topic, count } = req.body;

    const prompt = `
Create ${count} MCQs about ${topic}.
Return JSON format:
[
{
question:"",
options:["","","",""],
correctAnswer:"A",
explanation:""
}
]
`;

    // Use the chat API (Gemini's latest stable approach)
    const model = gemini.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Generate content
    const result = await model.generateContent(prompt);

    // Get text output
    const text = result.response.text;

    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error("Failed to parse Gemini output:", text);
      return res.status(500).json({
        message: "Failed to parse JSON from Gemini response",
        raw: text,
      });
    }

    res.json(data);
  } catch (err) {
    console.error("Generate-AI error:", err);
    res.status(500).json({ message: err.message });
  }
});

router.get("/domains", authMiddleware, async (req, res) => {
  try {
    const domains = await Mcq.distinct("domain");
    res.json(domains);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ----------------------
// GET MCQs filtered by domain & level
// ----------------------
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { domain, level } = req.query;
    const filter = {};
    if (domain) filter.domain = domain;
    if (level) filter.level = Number(level);
    // console.log("/getall", domain);
    const mcqs = await Mcq.find(filter).sort({ level: 1, step: 1 });
    // console.log("/getall", mcqs);

    // console.log(mcqs);

    res.json(mcqs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ----------------------
// POST create new MCQ
// ----------------------
router.post("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const {
      domain,
      level,
      step,
      question,
      options,
      correctAnswer,
      explanation,
      timeLimit,
    } = req.body;

    // Validations
    if (!domain?.trim() || !question?.trim() || !explanation?.trim())
      return res.status(400).json({ message: "All fields are required" });

    if (
      !Array.isArray(options) ||
      options.length !== 4 ||
      options.some((o) => !o.trim())
    )
      return res
        .status(400)
        .json({ message: "Exactly 4 options are required" });

    const count = await Mcq.countDocuments({ domain, level });
    if (count >= 25)
      return res
        .status(400)
        .json({ message: "Maximum 25 questions per level reached" });

    const existingStep = await Mcq.findOne({ domain, level, step });
    if (existingStep)
      return res
        .status(400)
        .json({ message: "Step already exists for this domain & level" });

    const mcq = new Mcq({
      domain,
      level,
      step,
      question,
      options,
      correctAnswer,
      explanation,
      timeLimit,
      createdBy: req.userId,
    });
    const saved = await mcq.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.put("/reorder", authMiddleware, adminOnly, async (req, res) => {
  // console.log("BODY RECEIVED:", req.body);
  try {
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({ message: "Questions array required" });
    }

    const bulkOps = questions.map((q) => ({
      updateOne: {
        filter: { _id: q._id },
        update: { step: q.step },
      },
    }));

    await Mcq.bulkWrite(bulkOps);

    res.json({ message: "Order updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});
// ----------------------
// PUT update MCQ
// ----------------------
router.put("/:id", authMiddleware, adminOnly, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid ID" });
  }

  try {
    const {
      domain,
      level,
      step,
      question,
      options,
      correctAnswer,
      explanation,
      timeLimit,
    } = req.body;

    // Validation
    if (!domain?.trim() || !question?.trim() || !explanation?.trim())
      return res.status(400).json({ message: "All fields are required" });

    if (
      !Array.isArray(options) ||
      options.length !== 4 ||
      options.some((o) => !o.trim())
    )
      return res
        .status(400)
        .json({ message: "Exactly 4 options are required" });

    const mcq = await Mcq.findById(req.params.id);
    if (!mcq) return res.status(404).json({ message: "MCQ not found" });

    // Ensure step uniqueness in same domain+level
    if (mcq.step !== step || mcq.level !== level || mcq.domain !== domain) {
      const conflict = await Mcq.findOne({
        domain,
        level,
        step,
        _id: { $ne: req.params.id },
      });
      if (conflict)
        return res
          .status(400)
          .json({ message: "Step already exists for this domain & level" });
    }

    mcq.domain = domain;
    mcq.level = level;
    mcq.step = step;
    mcq.question = question;
    mcq.options = options;
    mcq.correctAnswer = correctAnswer;
    mcq.explanation = explanation;
    mcq.timeLimit = timeLimit;

    const updated = await mcq.save();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ----------------------
// DELETE MCQ
// ----------------------
router.delete("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    const mcq = await Mcq.findById(req.params.id);

    if (!mcq) {
      return res.status(404).json({ message: "MCQ not found" });
    }

    await Mcq.findByIdAndDelete(req.params.id);

    res.json({ message: "MCQ deleted successfully" });
  } catch (err) {
    console.error("Delete MCQ error:", err);
    res.status(500).json({ message: err.message });
  }
});
// ----------------------
// PUT reorder levels within a domain
// ----------------------
router.put("/levels/order", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { domain, levels } = req.body; // levels = [3,1,2] -> new order of level numbers
    if (!domain || !Array.isArray(levels))
      return res
        .status(400)
        .json({ message: "Domain and levels array required" });

    // Check all levels exist
    const existingLevels = await Mcq.find({ domain }).distinct("level");
    const missing = levels.filter((l) => !existingLevels.includes(l));
    if (missing.length)
      return res
        .status(400)
        .json({ message: `Levels not found: ${missing.join(", ")}` });

    // Optional: save order in a separate collection if you want persistent order
    // For simplicity, front-end can just use the order array

    res.json({ message: "Level order accepted", order: levels });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET LEVELS WITH PROGRESSION
router.get("/levels/:domain", authMiddleware, async (req, res) => {
  try {
    const { domain } = req.params;
    const userId = req.user._id;

    // 1️⃣ Get all levels for domain
    const levels = await Mcq.find({ domain }).distinct("level");

    const sortedLevels = levels.sort((a, b) => a - b);

    // 2️⃣ Get user's passed exams
    const exams = await Exam.find({
      user: userId,
      domain,
      submitted: true,
    });

    // map: level -> best percentage
    const progressMap = {};
    exams.forEach((exam) => {
      if (
        !progressMap[exam.level] ||
        exam.percentage > progressMap[exam.level]
      ) {
        progressMap[exam.level] = exam.percentage;
      }
    });

    // 3️⃣ Build response
    const result = sortedLevels.map((level, index) => {
      if (level === 1) {
        return {
          level,
          unlocked: true,
        };
      }

      const prevLevel = level - 1;
      const prevScore = progressMap[prevLevel] || 0;

      return {
        level,
        unlocked: prevScore >= 80,
      };
    });

    res.json(result);
  } catch (err) {
    console.error("Level fetch error:", err);
    res.status(500).json({ message: "Failed to fetch levels" });
  }
});
// DELETE entire level
router.post(
  "/deletedomainlevel",
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const { domain, level } = req.query;
      console.log("domain level", domain, level);
      if (!domain || level === undefined) {
        return res.status(400).json({ message: "Domain and level required" });
      }

      const result = await Mcq.deleteMany({
        domain,
        level: Number(level),
      });
      // console.log(
      //   `Leveldelete Deleted ${result.deletedCount} questions from Level ${level}  `,
      // );
      res.json({
        message: `Deleted ${result.deletedCount} questions from Level ${level}`,
      });
    } catch (err) {
      console.error("Delete level error:", err);
      res.status(500).json({ message: err.message });
    }
  },
);

router.post("/delete-selected", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !ids.length) {
      return res.status(400).json({ message: "No IDs provided" });
    }

    const result = await Mcq.deleteMany({
      _id: { $in: ids },
    });

    res.json({
      message: `Deleted ${result.deletedCount} questions`,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
export default router;
