import nodemailer from "nodemailer";
import dotenv from "dotenv";
import axios from "axios";
import { google } from "googleapis";
dotenv.config(); // loads env vars from .env

const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
);
oAuth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN,
});

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;
const gmail = google.gmail({
  version: "v1",
  auth: oAuth2Client,
});
export const getInbox = async () => {
  try {
    const res = await gmail.users.messages.list({
      userId: "me",
      maxResults: 20,
    });

    return res.data.messages || [];
  } catch (err) {
    console.error("Inbox fetch error:", err);
    return [];
  }
};
const getBody = (payload) => {
  let body = "";

  const findPart = (parts) => {
    for (let p of parts) {
      if (p.mimeType === "text/html" && p.body?.data) {
        return p.body.data;
      }

      if (p.mimeType === "text/plain" && p.body?.data) {
        return p.body.data;
      }

      if (p.parts) {
        const nested = findPart(p.parts);
        if (nested) return nested;
      }
    }
    return null;
  };

  if (payload.parts) {
    body = findPart(payload.parts);
  } else if (payload.body?.data) {
    body = payload.body.data;
  }

  return body ? Buffer.from(body, "base64").toString("utf-8") : "";
};
export const getEmailDetails = async (id) => {
  const res = await gmail.users.messages.get({
    userId: "me",
    id,
  });

  const headers = res.data.payload.headers;

  const getHeader = (name) => headers.find((h) => h.name === name)?.value;

  const body = getBody(res.data.payload);

  return {
    id,
    subject: getHeader("Subject"),
    from: getHeader("From"),
    date: getHeader("Date"),
    snippet: res.data.snippet,
    body,
  };
};
// Create reusable transporter
const transporterWAITS = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});
const accessToken = await oAuth2Client.getAccessToken();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
    accessToken: accessToken?.token,
  },
});

// Generic function to send styled emails
export const sendMail = async ({ to, subject, html }) => {
  const mailOptions = {
    from: `"Maurya AI" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: error.message };
  }
};

export const sendTelegramMessage = async ({ chatId, text }) => {
  try {
    const res = await axios.post(`${BASE_URL}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: "HTML", // supports formatting
    });

    return {
      success: true,
      data: res.data,
    };
  } catch (error) {
    const errData = error.response?.data;

    console.error("❌ Telegram Error:", errData || error.message);
    if (errData?.description?.includes("chat not found")) {
      return {
        success: false,
        error:
          "Telegram not connected. Please start the bot first: https://t.me/MauryaTechBot",
      };
    }

    return {
      success: false,
      error: errData?.description || error.message,
    };
  }
};
export const sendTelegramOtp = async (chatId, otp) => {
  const appName = "Maurya AI"; // you can move to env later
  const appLink = process.env.DeployLink || "https://yourwebsite.com";

  const message = `
🔐 <b>${appName} • Secure Verification</b>

━━━━━━━━━━━━━━━

Your One-Time Password (OTP):

👉 <b style="font-size:18px;">${otp}</b>

⏳ Valid for <b>5 minutes</b>

━━━━━━━━━━━━━━━

⚠️ <b>Security Notice</b>
Do not share this code with anyone.
Our team will never ask for your OTP.

━━━━━━━━━━━━━━━

🌐 <a href="${appLink}">Open ${appName}</a>
`;

  return await sendTelegramMessage({
    chatId,
    text: message,
  });
};
export const parseIdentifier = (value) => {
  const input = value.trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // ✅ Email
  if (emailRegex.test(input)) {
    return {
      type: "email",
      value: input,
    };
  }

  // ✅ Numeric → Telegram chat ID
  if (/^\d+$/.test(input)) {
    return {
      type: "telegram",
      value: input,
    };
  }

  // ✅ Username (with or without @)
  const username = input.startsWith("@") ? input.slice(1) : input;

  if (/^[a-zA-Z0-9_]{5,}$/.test(username)) {
    return {
      type: "telegram_username",
      value: username,
    };
  }

  return {
    type: "invalid",
    value: input,
  };
};
export const sendTelegramLoginAlert = async ({
  chatId,
  ip,
  device,
  browser,
  os,
}) => {
  const message = `
🚨 <b>New Login Detected</b>

Device: ${browser} on ${os}
Type: ${device}
IP: ${ip}
Time: ${new Date().toLocaleString()}

If this wasn't you, change password immediately.
  `;

  return await sendTelegramMessage({
    chatId,
    text: message,
  });
};
