// models/user.js
import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  hash: String,
});
export default mongoose.model("User", userSchema);
