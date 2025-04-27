import mongoose from "mongoose";

// Define the user schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

// Export the model using ES module syntax
export default mongoose.model("User", userSchema);
