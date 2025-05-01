import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config(); // loads env vars from .env

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: "gmail", // or use host/port if using SMTP server
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
