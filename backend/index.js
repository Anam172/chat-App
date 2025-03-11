const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const groupRoutes = require("./routes/groupRoutes");
const Message = require("./models/Message");
const User = require("./models/User");

dotenv.config();
const app = express();


const allowedOrigins = ["http://localhost:5173"];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URL, { dbName: "chatAppDB" })
  .then(() => console.log("MongoDB connected successfully"))
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });

// Routes
app.use("/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/groups", groupRoutes);


// Socket.io Setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

global.io = io;  

const users = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Handle user connection
  socket.on("userConnected", async (userId) => {
    if (!userId) return;

    users.set(userId, socket.id);
    socket.userId = userId;

    // Update user online status in the database
    await User.findByIdAndUpdate(userId, { isOnline: true });

    updateAllUserStatuses();
  });

  // Handle user disconnection
  socket.on("disconnect", async () => {
    if (socket.userId) {
      users.delete(socket.userId);
      const lastSeenTime = new Date();

      // Update last seen and mark user as offline
      await User.findByIdAndUpdate(socket.userId, { 
        isOnline: false, 
        lastSeen: lastSeenTime 
      });

      //Emit updated user statuses
      updateAllUserStatuses();
    }
    console.log("User disconnected:", socket.id);
  });


// Emit Updated User Status to All Clients
const updateAllUserStatuses = async () => {
  try {
    const allUsers = await User.find({}, "isOnline lastSeen");
    io.emit("update-user-status", allUsers);
  } catch (error) {
    console.error("Error fetching user statuses:", error);
  }
};

  // Listen for typing events
  socket.on("typing", ({ senderId, receiverId }) => {
    socket.to(receiverId).emit("userTyping", { senderId });
  });

  socket.on("stopTyping", ({ senderId, receiverId }) => {
    socket.to(receiverId).emit("userStoppedTyping", { senderId });
  });

  // Handle individual chat messages
  socket.on("sendMessage", async (message) => {
    console.log("Received message in backend:", message);
  
    if (!message.sender || !message.receiver) {
      console.error("Missing sender or receiver ID:", message);
      return;
    }
  
    try {
      // Convert sender & receiver to ObjectId correctly
      const senderId = new mongoose.Types.ObjectId(message.sender);
      const receiverId = new mongoose.Types.ObjectId(message.receiver);
  
      const newMessage = new Message({
        sender: senderId,
        receiver: receiverId,
        message: message.message || "",
        file: message.file || null,
        timestamp: message.timestamp || new Date(),
        status: "sent",
      });
  
      await newMessage.save();
  
      console.log("Emitting message to sender & receiver:", newMessage);
  
      io.to([users.get(senderId.toString()), users.get(receiverId.toString())])
        .emit("receiveMessage", newMessage);
  
    } catch (error) {
      console.error("Error processing message:", error);
    }
  });
  

  // Mark messages as read
  socket.on("messageRead", async ({ messageId }) => {
    try {
      const updatedMessage = await Message.findByIdAndUpdate(
        messageId,
        { status: "read" },
        { new: true }
      );

      if (!updatedMessage) {
        console.error("Message not found for read update:", messageId);
        return;
      }

      // Emit read status update to the sender
      io.to(users.get(updatedMessage.sender)).emit("updateMessageStatus", {
        messageId: updatedMessage._id,
        status: "read",
      });
    } catch (error) {
      console.error("Error updating message status:", error);
    }
  });

  // Handle joining group rooms
  socket.on("joinGroup", async (groupId) => {
    if (!groupId) return;
    
    socket.join(groupId);
    console.log(`User ${socket.id} joined Group Room: ${groupId}`);
  });


  // Handle group chats
  socket.on("sendGroupMessage", async (data) => {
    try {
      let { groupId, sender, message, file } = data;
  
      if (!groupId || !sender) {
        console.error("Missing groupId or sender in group message:", data);
        return;
      }
  
      const newMessage = new Message({
        sender,
        group: groupId,
        message: message || "",
        file: file || null,
        timestamp: new Date(),
        status: "sent",
      });
  
      await newMessage.save();
  
      console.log("Sending group message to all users in group:", newMessage);

      //Send message to all users in the group
      io.to(groupId).emit("receiveGroupMessage", newMessage);
    } catch (error) {
      console.error("Error sending group message:", error);
    }
  }); 
});


// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on Port ${PORT}`);
});
