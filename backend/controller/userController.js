const User = require("../models/User");
const avatars = require("../models/Avatars"); // Fixed import

// Save user avatar
const saveAvatar = async (req, res) => {
  const { userId, avatarSrc } = req.body;

  try {
    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.avatar = avatarSrc; // Store the avatar
    await user.save();

    res.status(200).json({ message: "Avatar saved successfully", user });
  } catch (error) {
    console.error("Error saving avatar:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get all registered users from MongoDB
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, "name avatar"); // Get only name and avatar
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Error fetching users" });
  }
};

// Fetch all avatars (fixed)
const getAllAvatars = (req, res) => {
  try {
    res.status(200).json(avatars); // Directly return avatars array
  } catch (error) {
    console.error("Error fetching avatars:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { getAllAvatars, saveAvatar, getAllUsers };
