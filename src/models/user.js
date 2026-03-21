import mongoose from "mongoose";

// Define the user schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,
  address: String,
  education: [
    {
      level: String,
      degree: String,
      field: String,
      institution: String,
      passingYear: Number,
      score: String,
    },
  ],
  workExperiences: [
    {
      jobTitle: String,
      company: String,
      employmentType: String,
      startDate: Date,
      endDate: Date,
      current: Boolean,
      responsibilities: String,
      achievements: String,
    },
  ],
  hobbies: [String], // Optional but highly recommended
  skills: { type: [String], default: [] },
  careerObjective: String,
  otp: String,
  otpExpiry: Date,
  // 🔥 NEW: Role for Admin
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  refreshToken: {
    type: String,
  },
  loginSessions: [
    {
      ip: String,
      browser: String,
      os: String,
      device: String,
      location: String,
      lastLogin: Date,
      firstLogin: Date,
      token: String,
    },
  ],
  badges: [
    {
      domain: String,
      level: Number,
      badge: String,
    },
  ],
});

// Export the model using ES module syntax
const User = mongoose.model("User", userSchema);

export default User;
