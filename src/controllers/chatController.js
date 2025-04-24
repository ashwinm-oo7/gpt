import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
// dotenv setup
dotenv.config();

// Required for `__dirname` in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Gemini init
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Helper function to read markdown file
const readMarkdownFile = () => {
  const filePath = path.join(__dirname, "./GPA_DEMO_Sections.md"); // Adjust path if needed
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return data;
  } catch (error) {
    console.error("Error reading markdown file:", error);
    return "Sorry, I couldn't load the system setup details.";
  }
};

// Main chat handler
export async function streamChat(req, res) {
  const userPrompt = req.body.messages;
  const systemMessageContent = readMarkdownFile();

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-001",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are an ERP software assistant. Here's the system setup:\n\n${systemMessageContent}\n\nUser query: ${userPrompt}`,
            },
          ],
        },
      ],
    });

    // Log the full response to debug the structure
    // console.log("Gemini Response: ", JSON.stringify(response, null, 2));

    // Access the text safely
    const generatedText =
      response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response received.";

    res.json({ content: generatedText });
  } catch (error) {
    console.error("Gemini error:", error);
    res.status(500).send("Gemini API error");
  }
}
