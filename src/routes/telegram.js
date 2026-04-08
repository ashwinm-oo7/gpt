import express from "express";
import TelegramUser from "../models/telegramUser.js";

const router = express.Router();

router.post("/telegram-webhook", async (req, res) => {
  res.sendStatus(200);

  // ✅ Process async AFTER response
  handleTelegram(req.body);
});

const handleTelegram = async (body) => {
  try {
    const message = body.message;
    if (!message) return;

    const chatId = message.chat.id;
    const username = message.from.username || `user_${message.from.id}`;
    const startPayload = message.text?.split(" ")[1];

    console.log("📩 Incoming:", username, chatId, startPayload);

    // Save user mapping
    await TelegramUser.findOneAndUpdate(
      { username },
      { chatId },
      { upsert: true },
    );

    // 🔥 LOGIN FLOW
    if (startPayload && global.telegramLoginTokens?.[startPayload]) {
      global.telegramLoginTokens[startPayload].chatId = chatId;
      global.telegramLoginTokens[startPayload].username = username;
      global.telegramLoginTokens[startPayload].verified = true;

      console.log("✅ VERIFIED TOKEN:", startPayload);
    }
  } catch (err) {
    console.error("❌ Telegram async error:", err);
  }
};
export default router;
