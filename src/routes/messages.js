const express = require("express");
const router = express.Router();
const { protect, isAdmin } = require("../middleware/authMiddleware");
const {
  sendMessage,
  getMyMessages,
  getAllConversations,
  getConversationMessages,
  getUnreadCount,
  deleteMessage
} = require("../controllers/messageController");
const { uploadChatAttachments } = require("../utils/chatUpload");

const handleChatUpload = (req, res, next) => {
  uploadChatAttachments.array("attachments", 5)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Upload file thất bại" });
    }
    next();
  });
};

// User routes
router.post("/", protect, handleChatUpload, sendMessage);
router.get("/my-messages", protect, getMyMessages);
router.get("/unread-count", protect, getUnreadCount);

// Admin routes
router.get("/conversations", protect, isAdmin, getAllConversations);
router.get("/conversations/:conversationId", protect, isAdmin, getConversationMessages);
// Route xóa tin nhắn - dùng pattern giống các route khác
router.delete("/:messageId", protect, isAdmin, deleteMessage);

module.exports = router;

