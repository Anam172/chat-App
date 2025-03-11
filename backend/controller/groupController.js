const Group = require("../models/Group");
const Message = require("../models/Message");

// Create a new group
exports.createGroup = async (req, res) => {
  try {
    const { name, members, avatar } = req.body;

    if (!name || !members || members.length < 2) {
      return res.status(400).json({ error: "A group must have a name and at least two members." });
    }

    const newGroup = new Group({ name, members, avatar });
    await newGroup.save();
    res.status(201).json(newGroup);
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

//  Get all groups for a user
exports.getUserGroups = async (req, res) => {
  try {
    const userId = req.params.userId;
    const groups = await Group.find({ members: userId }).populate("members", "name avatar");
    
    const formattedGroups = groups.map((group) => ({
      _id: group._id,
      name: group.name,
      avatar: group.avatar,
      members: group.members.map((member) => ({ name: member.name, avatar: member.avatar })),
    }));

    res.json(formattedGroups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


// Send a message in a group
exports.sendGroupMessage = async (req, res) => {
  try {
    console.log("Received Group Message Request:", req.body);

    const { groupId } = req.params;
    const { sender, message, file } = req.body;

    if (!sender || (!message && !file)) {
      return res.status(400).json({ error: "Sender and message or file are required." });
    }

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    const newMessage = new Message({
      sender,
      group: groupId,
      message,
      file,
      timestamp: new Date(),
      status: "sent"
    });

    await newMessage.save();

    console.log("Message saved:", newMessage);

    // Emit only if not already sent
    global.io.to(groupId).emit("receiveGroupMessage", newMessage);

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


// Get messages of a group
exports.getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const messages = await Message.find({ group: groupId })
      .populate("sender", "name avatar") // Show sender details
      .sort({ timestamp: 1 }); // Sort messages by time

    res.json(messages);
  } catch (error) {
    console.error("Error fetching group messages:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
