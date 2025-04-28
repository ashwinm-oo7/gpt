import express from "express";
import dotenv from "dotenv";
import chatRoutes from "./src/routes/chat.js";
import LoginRoutes from "./src/routes/auth.js";
import mongoose from "mongoose";

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
import cors from "cors";

dotenv.config();

const app = express();
app.use(express.json()); // This is required to parse JSON in POST requests

// app.use(
//   cors({
//     origin: process.env.DeployLink || "http://localhost:3000",

//     methods: ["GET", "POST", "DELETE", "PUT", "OPTIONS"],
//   })
// );

const allowedOrigins = ["http://localhost:3000"];

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
          new Error(`CORS policy does not allow access from origin ${origin}`)
        );
      }
    },
    methods: ["GET", "POST", "DELETE", "PUT", "OPTIONS"],
    credentials: true,
  })
);

// Use the chat routes
app.use("/chats", chatRoutes);
app.use("/api/auth", LoginRoutes);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
