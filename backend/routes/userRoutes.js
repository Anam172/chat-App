const express = require("express");
const { saveAvatar, getAllUsers, getAllAvatars } = require("../controller/userController");
const User = require("../models/User"); 


const router = express.Router();

// Fetch all avatars
router.get("/avatars", getAllAvatars);

// Save avatar for a user
router.post("/avatar", saveAvatar);

// Get all users from MongoDB
router.get("/", getAllUsers);

//  Get Online Users
router.get("/online", async (req, res) => {
    try {
      const onlineUsers = await User.find({ isOnline: true }).select("name email avatar isOnline lastSeen");
      res.status(200).json(onlineUsers);
    } catch (error) {
      console.error("Error fetching online users:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

module.exports = router;
