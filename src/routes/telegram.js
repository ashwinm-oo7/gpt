import express from "express";
import TelegramUser from "../models/telegramUser.js";

const router = express.Router();

router.post("/telegram-webhook", async (req, res) => {
  try {
    const message = req.body.message;
    if (!message) return res.sendStatus(200);

    const chatId = message.chat.id;
    const username = message.from.username;
    const startPayload = message.text?.split(" ")[1]; // 👈 token

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
    }

    console.log("✅ VERIFIED TOKEN:", startPayload);

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});
export default router;
