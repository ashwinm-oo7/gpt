import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import chatRoutes from "./src/routes/chat.js";
import LoginRoutes from "./src/routes/auth.js";
import searchEngineRoutes from "./src/routes/searchEngine.js";
import generatorRoutes from "./src/routes/generator.js";
import aiRouter from "./src/aiEngine/router.js";
import userRoutes from "./src/routes/userRoutes.js";
import profileRoutes from "./src/routes/profileRoutes.js";
import mcqRoutes from "./src/routes/mcqRoutes.js";
import examRoutes from "./src/routes/exam.js";
import adminExamRoutes from "./src/routes/adminExam.js";
import telegramRoutes from "./src/routes/telegram.js";

import http from "http";
// import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

dotenv.config();
import csrf from "csurf";
import { initSocket } from "./src/utils/socket.js";

// const csrfProtection = csrf({ cookie: true });

const requiredEnvVars = [
  "MONGO_USERNAME",
  "MONGO_PASSWORD",
  "MONGO_URI",
  "dbName",
];

requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    console.error(`Missing environment variable: ${varName}`);
    throw new Error(`Environment variable ${varName} is missing`);
  }
});
// Socket.IO setup
// export const io = new Server(server, {
//   cors: {
//     origin: ["http://localhost:3000", process.env.DeployLink].filter(Boolean),
//     methods: ["GET", "POST"],
//     credentials: true,
//   },
// });

// MongoDB URI construction
const username = process.env.MONGO_USERNAME;
const password = process.env.MONGO_PASSWORD;
const dbName = process.env.dbName;
const uri = `mongodb+srv://${username}:${encodeURIComponent(password)}@${
  process.env.MONGO_URI
}/${dbName}?retryWrites=true&w=majority`;

// Connect to MongoDB
mongoose
  .connect(uri)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection failed:", err));

app.set("trust proxy", 1);
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
app.disable("x-powered-by");
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);
const allowedOrigins = [
  "https://mauryagpt.vercel.app",
  "http://localhost:3000",
];

if (process.env.DeployLink) {
  allowedOrigins.push(process.env.DeployLink);
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(
          new Error(`CORS policy does not allow access from origin ${origin}`),
        );
      }
    },
    methods: ["GET", "POST", "DELETE", "PUT", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
    credentials: true,
  }),
);
// app.get("/api/csrf-token",csrfProtection, (req, res) => {
//   res.json({ csrfToken: req.csrfToken() });
// });
// Use the chat routes
app.use("/chats", chatRoutes);
app.use("/api/auth", LoginRoutes);
app.use("/search-engine", searchEngineRoutes);
app.use("/ai-generator", generatorRoutes);
app.use("/ai", aiRouter);
app.use("/api/user", userRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/mcq", mcqRoutes);
app.use("/api/exam", examRoutes);
app.use("/api/admin/exams", adminExamRoutes);
app.use("/api/telegram", telegramRoutes);
// Start the server
// Socket.IO connection logging
const io = initSocket(server);
io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
