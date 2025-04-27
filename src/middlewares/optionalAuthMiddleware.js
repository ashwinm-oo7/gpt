// middlewares/optionalAuthMiddleware.js
import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";

export default function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  // console.log("authHeader:", authHeader); // 🔥 log it

  if (authHeader) {
    const token = authHeader.split(" ")[1];
    // console.log("Extracted token:", token); // 🔥 log token

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // console.log("Decoded JWT:", decoded); // 🔥 log decoded payload
      req.user = { userId: decoded.userId };
    } catch (err) {
      console.log("Invalid token, proceeding without login.", err.message); // 🔥 see error clearly
    }
  }

  next();
}
