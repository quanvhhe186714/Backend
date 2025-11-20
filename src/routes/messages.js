const express = require("express");
const router = express.Router();
const { protect, isAdmin } = require("../middleware/authMiddleware");
const {
  sendMessage,
  getMyMessages,
  getAllConversations,
  getConversationMessages,
  getUnreadCount
} = require("../controllers/messageController");

// User routes
router.post("/", protect, sendMessage);
router.get("/my-messages", protect, getMyMessages);
router.get("/unread-count", protect, getUnreadCount);

// Admin routes
router.get("/conversations", protect, isAdmin, getAllConversations);
router.get("/conversations/:conversationId", protect, isAdmin, getConversationMessages);

module.exports = router;

