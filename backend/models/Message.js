const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: false }, 
  file: { type: String },
  status: { type: String, enum: ["sent", "delivered", "read"], default: "sent" },
  timestamp: { type: Date, default: Date.now } 
}, 
{ timestamps: true }
);

module.exports = mongoose.model("Message", MessageSchema);
