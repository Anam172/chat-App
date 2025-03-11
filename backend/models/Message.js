const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  group: { type: mongoose.Schema.Types.ObjectId, ref: "Group",  required: false },
  message: { type: String, required: false }, 
  file: { type: String },
  status: { type: String, enum: ["sent", "delivered", "read"], default: "sent" },
  timestamp: { type: Date, default: Date.now } 
}, 
{ timestamps: true }
);


// Ensure either `receiver` (for private chat) or `group` (for group chat) is set
MessageSchema.pre("save", function (next) {
  if (!this.receiver && !this.group) {
    return next(new Error("Message must have either a receiver or a group."));
  }
  next();
});

module.exports = mongoose.model("Message", MessageSchema);
