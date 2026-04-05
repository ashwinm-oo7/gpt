import nodemailer from "nodemailer";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config(); // loads env vars from .env

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: "gmail", // or use host/port if using SMTP server
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
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
    return { success: false, error };
  }
};

export const sendTelegramOtp = async (chatId, otp) => {
  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

    const message = `🔐 Your OTP is: ${otp}`;

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    await axios.post(url, {
      chat_id: chatId,
      text: message,
    });

    return { success: true };
  } catch (error) {
    console.error("Telegram error:", error.response?.data || error.message);
    return { success: false, error: "Telegram OTP failed" };
  }
};
export const parseIdentifier = (value) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (emailRegex.test(value)) {
    return {
      type: "email",
      value,
    };
  }

  // Telegram username (@username)
  if (value.startsWith("@")) {
    return {
      type: "telegram",
      value: value.replace("@", ""),
    };
  }

  // Telegram chat ID (numbers)
  if (/^\d+$/.test(value)) {
    return {
      type: "telegram",
      value,
    };
  }

  return {
    type: "invalid",
    value,
  };
};
