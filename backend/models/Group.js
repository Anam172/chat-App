const mongoose = require("mongoose");

const GroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], 
    messages: [
      {
        sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        message: String,
        file: String,
        timestamp: { type: Date, default: Date.now },
        status: { type: String, enum: ["sent", "delivered", "read"], default: "sent" },
      },
    ],
    avatar: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Group", GroupSchema);
