import express from "express";
import { streamChat } from "../controllers/chatController.js";

const router = express.Router();

// Define the chat route
router.post("/chat", streamChat);

export default router;
