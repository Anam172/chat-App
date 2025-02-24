const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Only for manual login
    googleId: { type: String }, // Only for Google login
    picture: { type: String }, // Profile picture
    avatar: { type: String }, // Store avatar URL or path
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
module.exports = User;
