const express = require("express");
const router = express.Router();
const groupController = require("../controller/groupController");

// Create a group
router.post("/", groupController.createGroup);

// Get all groups for a user
router.get("/:userId", groupController.getUserGroups);

// Send a message in a group
router.post("/:groupId/send", groupController.sendGroupMessage);

// Get messages of a group
router.get("/:groupId/messages", groupController.getGroupMessages);

module.exports = router;
