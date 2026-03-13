// middlewares/auth.js
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import dotenv from "dotenv";
dotenv.config();

export const tokenBlacklist = new Set(); // optional
// Verify JWT and attach user to req
export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token" });

    const token = authHeader.split(" ")[1];

    if (tokenBlacklist.has(token)) {
      return res.status(401).json({ message: "Token revoked" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = user; // full user object
    req.userId = user._id; // for convenience
    req.token = token; // store token if needed
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Only admin users
export const adminOnly = async (req, res, next) => {
  // Ensure verifyToken runs first
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }

  next();
};
