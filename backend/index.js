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
const Message = require("./models/Message");

dotenv.config();
const app = express();

// Ensure 'uploads' folder exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
  console.log("Uploads folder created successfully.");
}

// Set up file storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

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


// Socket.io Setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("sendMessage", async (message) => {
    console.log("Message received:", message);

    if (!message.sender || !message.receiver) {
      console.log("❌ Missing sender or receiver ID in message:", message);
      return;
    }

    // Check if the message was already stored
    const existingMessage = await Message.findOne({
      sender: message.sender,
      receiver: message.receiver,
      message: message.message || "",
      file: message.file ? message.file : null,
    });

    if (existingMessage) {
      console.log("Duplicate message detected. Skipping save.");
      return;
    }

    const newMessage = new Message({
      sender: message.sender,
      receiver: message.receiver,
      message: message.message || "",
      file: message.file ? message.file : null,
      timestamp: message.timestamp || new Date(), // Ensure timestamp is stored
    });

    await newMessage.save();
    io.emit("receiveMessage", newMessage); // Emit to all users
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});



// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on Port ${PORT}`);
});
