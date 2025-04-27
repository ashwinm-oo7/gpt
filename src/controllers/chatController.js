import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Chat from "../models/Chat.js"; // Importing Chat model

// dotenv setup
import dotenv from "dotenv";
import user from "../models/user.js";
import ReservedChat from "../models/reservedChat.js";
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
  const userId = req.user?.userId || req.body.userID || null;
  const chatId = req.params.chatId;
  const conversation = req.body.conversation || []; // Full chat history
  const { topic } = req.body;

  // const userPrompt = req.body.messages;
  const systemMessageContent = readMarkdownFile();

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache");
  if (!conversation || conversation.length === 0) {
    return res.status(400).json({ error: "No conversation provided." });
  }
  if (chatId) {
    const existingChat = await Chat.findOne({ _id: chatId, userId });

    if (!existingChat) {
      // return res.status(404).json({ error: "Chat ID not found for the user." });
    }
  }

  try {
    const chatHistoryFormatted = conversation
      .map((msg) => {
        return `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`;
      })
      .join("\n");
    const fullPrompt = `
      You are an ERP software assistant. Here are the system setup details:
      ${systemMessageContent}
Here is the conversation so far:
${chatHistoryFormatted}

Now continue the conversation smartly.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-001",
      contents: [
        {
          role: "user",
          // parts: [
          //   {
          //     text: `You are an ERP software assistant. Here's the system setup:\n\n${systemMessageContent}\n\nUser query: ${userPrompt}`,
          //   },
          // ],
          parts: [{ text: fullPrompt }],
        },
      ],
    });

    // Log the full response to debug the structure
    // console.log("Gemini Response: ", JSON.stringify(response, null, 2));

    // Access the text safely
    const generatedText =
      response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response received.";
    if (!generatedText) {
      return res
        .status(500)
        .json({ error: "No valid response from Gemini AI." });
    }

    const lastUserMessage =
      conversation[conversation.length - 1]?.content || "";
    const userChat = await Chat.findOne({ userId });
    if (userId) {
      if (!userChat) {
        // No previous chat data exists, create a new one
        const newChat = new Chat({
          userId,
          topic: topic || "General",
          messages: [
            { role: "user", content: lastUserMessage },
            { role: "bot", content: generatedText },
          ],
        });

        await newChat.save();
      } else {
        // If user has chat history, push the new messages
        if (chatId) {
          await Chat.findOneAndUpdate(
            { _id: chatId, userId },
            {
              $push: {
                messages: {
                  $each: [
                    { role: "user", content: lastUserMessage },
                    { role: "bot", content: generatedText },
                  ],
                },
              },
            },
            { new: true }
          );
        } else {
          // No chatId provided, create a new chat
          const newChat = new Chat({
            userId,
            topic: topic || "General",
            messages: [
              { role: "user", content: lastUserMessage },
              { role: "bot", content: generatedText },
            ],
          });
          await newChat.save();
        }
      }
    }
    // if (lastUserMessage.includes("MauryaSaved")) {
    //   const userChat = await ReservedChat.findOne({ userId });

    //   if (!userChat) {
    //     const newChat = new ReservedChat({
    //       userId,
    //       topic: topic || "Saved Data",
    //       messages: [
    //         { role: "user", content: lastUserMessage },
    //         { role: "bot", content: generatedText },
    //       ],
    //     });
    //     await newChat.save();
    //   } else {
    //     await Chat.findOneAndUpdate(
    //       { _id: chatId, userId },
    //       {
    //         $push: {
    //           messages: {
    //             $each: [
    //               { role: "user", content: lastUserMessage },
    //               { role: "bot", content: generatedText },
    //             ],
    //           },
    //         },
    //       },
    //       { new: true }
    //     );
    //   }
    // }
    console.log(generatedText);
    res.json({ content: generatedText });
  } catch (error) {
    console.error("Gemini error:", error);
    res.status(500).send("Gemini API error");
  }
}

// 📜 Fetch Chat History for Logged In User
export async function getChatHistory(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.user?.userId || req.body.userID || null;
    // const userids = await user.findById({ _id: userId });

    const chat = await Chat.findOne({ _id: chatId, userId });
    if (!chat) {
      return res.status(404).json({ message: "Chat not found." });
    }

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized. Please login to view history." });
    }

    // const chat = await Chat.findOne({ userId });

    if (!chat) {
      return res.status(404).json({ message: "No chat history found." });
    }

    res.json({ conversation: chat });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ message: "Server Error" });
  }
}

// 📜 Reset Chat History (Logged In)
export async function resetChatHistory(req, res) {
  try {
    const userId = req.user?.userId;
    const chatId = req.params.chatId || null; // Optional chatId

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized. Please login to clear history." });
    }
    if (chatId) {
      // Delete a specific chat
      const deletedChat = await Chat.findOneAndDelete({ _id: chatId, userId });

      if (!deletedChat) {
        return res
          .status(404)
          .json({ message: "No chat history found to clear." });
      }

      return res.json({ message: "Chat history cleared successfully!" });
    }
  } catch (error) {
    console.error("Error clearing chat history:", error);
    res.status(500).json({ message: "Server Error" });
  }
}

export async function resetChatFull(req, res) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized. Please login to clear history." });
    }

    if (userId) {
      // Delete a specific chat

      // Delete all chats for the user
      const result = await Chat.deleteMany({ userId });

      if (result.deletedCount === 0) {
        return res
          .status(404)
          .json({ message: "No chat history found to delete." });
      }

      return res.json({ message: "All chat history deleted successfully." });
    }
  } catch (error) {
    console.error("Error clearing chat history:", error);
    res.status(500).json({ message: "Server Error" });
  }
}

export async function getChatById(req, res) {
  try {
    const userId = req.user?.userId || req.body.userID || null;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized. Please login." });
    }

    const chats = await Chat.find({ userId }).select("topic _id"); // Fetch all chats for the user
    if (!chats || chats.length === 0) {
      return res.status(404).json({ message: "No chat history found." });
    }

    res.json({ conversations: chats });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ message: "Server Error" });
  }
}

export async function newChat(req, res) {
  try {
    const userId = req.user?.userId || req.body.userID || null;

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized. Please login to start a new chat." });
    }

    const { topic } = req.body; // Optional: You can pass a topic with the new chat

    const newChat = new Chat({
      userId,
      topic: topic || "General", // Default topic if none is provided
      messages: [],
    });

    await newChat.save();

    res.json({
      message: "New chat started successfully!",
      chatId: newChat._id, // Send the unique chat ID to the frontend
      chat: newChat,
    });
  } catch (error) {
    console.error("Error starting new chat:", error);
    res.status(500).json({ message: "Server Error" });
  }
}
