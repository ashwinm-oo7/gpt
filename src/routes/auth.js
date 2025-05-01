import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.js"; // Use .js because it's an ES module
import Otp from "../models/otp.js"; // Add this at the top
import { sendMail } from "../utils/mailer.js";
import { getOtpTemplate } from "../templates/otpTemplate.js";

const router = express.Router();
import dotenv from "dotenv";
// const otpStore = new Map();
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

router.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ msg: "Email is required" });

  const existingUser = await User.findOne({ email });
  if (existingUser) return res.status(400).json({ msg: "User already exists" });
  const recentOtp = await Otp.findOne({ email }).sort({ createdAt: -1 });
  if (recentOtp && Date.now() - recentOtp.createdAt.getTime() < 60000) {
    return res.status(429).json({
      msg: "Please wait at least 60 seconds before requesting another OTP.",
    });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  // otpStore.set(email, { otp, expires: Date.now() + 5 * 60 * 1000 });
  console.log("otp", otp);
  try {
    await Otp.create({ email, otp });

    await sendMail({
      to: email,
      subject: "Your OTP for Registration",
      html: getOtpTemplate(otp, email),
    });

    res.json({ msg: "OTP sent to email." });
  } catch (error) {
    console.error("Email send error:", error);
    res.status(500).json({ msg: "Failed to send OTP." });
  }
});

// Route: Verify OTP and Register
router.post("/verify-otp", async (req, res) => {
  const { email, password, otp } = req.body;
  console.log("Received OTP verification request:", { email, otp });

  try {
    const record = await Otp.findOne({ email, otp });
    console.log("OTP record from DB:", record);

    if (!record) {
      return res.status(400).json({ msg: "Invalid or expired OTP." });
    }
    const existingUser = await User.findOne({ email });
    console.log("Existing user:", existingUser);

    if (existingUser) {
      await Otp.deleteMany({ email });
      console.log("User already exists. Deleted OTPs.");
      return res.status(400).json({ msg: "User already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword });
    await user.save();
    console.log("User registered successfully:", user);

    await Otp.deleteMany({ email });
    res.json({ msg: "Registered successfully" });
  } catch (error) {
    res.status(500).json({ msg: "Registration failed." });
    console.error("Error in OTP verification:", error);

    await Otp.deleteMany({ email });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    console.log("User not found");
    return res.status(400).json({ msg: "Invalid credentials" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    console.log("Password does not match");
    return res.status(400).json({ msg: "Invalid credentials" });
  }
  const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
    expiresIn: "24h",
  });
  res.json({ token });
});

router.get("/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ msg: "No token provided" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });

    res.json({ userId: user._id, email: user.email });
  } catch (error) {
    console.error(error);
    res.status(401).json({ msg: "Invalid token" });
  }
});

export default router;
