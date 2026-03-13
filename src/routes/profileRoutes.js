import express from "express";

import {
  getProfile,
  updateProfile,
  sendPasswordOtp,
  verifyOtpAndChangePassword,
} from "../controllers/profileController.js";

import { authMiddleware } from "../middlewares/optionalAuthMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getProfile);

router.put("/", authMiddleware, updateProfile);

router.post("/change-password/send-otp", authMiddleware, sendPasswordOtp);

router.post(
  "/change-password/verify",
  authMiddleware,
  verifyOtpAndChangePassword,
);

export default router;
