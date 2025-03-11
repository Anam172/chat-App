const express = require("express");
const multer = require("multer");
const path = require("path");
const mongoose = require("mongoose");
const fs = require("fs");
const Message = require("../models/Message");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
  console.log("Uploads folder created.");
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Send a message (with or without a file)
router.post("/send", authMiddleware, upload.single("file"), async (req, res) => {
  console.log("Received File:", req.file); // Debugging log
  try {
    const { sender, receiver, message, timestamp } = req.body; // Accept timestamp from frontend
    const file = req.file ? `http://localhost:5000/uploads/${req.file.filename}` : null;

    if (!sender || !receiver) {
      return res.status(400).json({ message: "Sender and receiver are required." });
    }

    const newMessage = new Message({ 
      sender, receiver, message, file, timestamp: timestamp || new Date(), status: "sent" });
    await newMessage.save();

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Error sending message", error });
  }
});

// Mark a Message as Read
router.post("/markAsRead", async (req, res) => {
  console.log("Received `markAsRead` request:", req.body);

  try {
    const { messageId } = req.body;

    if (!messageId) {
      console.error("No messageId provided");
      return res.status(400).json({ message: "Message ID is required" });
    }

    const message = await Message.findByIdAndUpdate(
      messageId,
      { status: "read" },
      { new: true }
    );

    if (!message) {
      console.error("Message not found:", messageId);
      return res.status(404).json({ message: "Message not found" });
    }

    console.log("Message updated to read:", message);
    res.json({ success: true, message });
  } catch (error) {
    console.error("Error updating message status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


// Get Messages Between Two Users
router.get("/:senderId/:receiverId", authMiddleware, async (req, res) => {
  try {
    const { senderId, receiverId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(senderId) || !mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ message: "Invalid sender or receiver ID." });
    }

    const messages = await Message.find({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId },
      ],
    }).sort({ timestamp: 1 }); 

    // Update unread messages to "delivered"
    await Message.updateMany(
      {
        sender: receiverId,  
        receiver: senderId,  
        status: "sent",
      },
      { $set: { status: "delivered" } }
    );
    
    // Notify sender that their messages were delivered
    messages.forEach((msg) => {
      if (msg.status === "sent") {
        global.io.emit("updateMessageStatus", { messageId: msg._id, status: "delivered" });
      }
    });

    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Error fetching messages", error });
  }
});


module.exports = router;
