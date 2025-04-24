import express from "express";
import dotenv from "dotenv";
import chatRoutes from "./src/routes/chat.js";
import cors from "cors";

dotenv.config();

const app = express();
app.use(express.json()); // This is required to parse JSON in POST requests

app.use(
  cors({
    origin: process.env.DeployLink || "http://localhost:3000", // Allow only requests from this origin
    methods: ["GET", "POST"], // Allow GET and POST methods
  })
);

// Use the chat routes
app.use("/api", chatRoutes);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
