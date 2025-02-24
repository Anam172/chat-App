const express = require("express");
const { saveAvatar, getAllUsers, getAllAvatars } = require("../controller/userController");

const router = express.Router();

// Fetch all avatars
router.get("/avatars", getAllAvatars);

// Save avatar for a user
router.post("/avatar", saveAvatar);

// Get all users from MongoDB
router.get("/", getAllUsers);

module.exports = router;
