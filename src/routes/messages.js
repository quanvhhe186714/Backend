const express = require("express");
const router = express.Router();
const { protect, isAdmin } = require("../middleware/authMiddleware");
const {
  sendMessage,
  getMyMessages,
  getAllConversations,
  getConversationMessages,
  getUnreadCount,
  getMessagesByOrderId,
  deleteMessage,
  updateMessageTimestamp
} = require("../controllers/messageController");
const { uploadChatAttachments, uploadToCloudinary } = require("../utils/chatUpload");

const handleChatUpload = (req, res, next) => {
  uploadChatAttachments.array("attachments", 5)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Upload file thất bại" });
    }
    // Upload lên Cloudinary sau khi multer xử lý
    await uploadToCloudinary(req, res, next);
  });
};

// User routes
router.post("/", protect, handleChatUpload, sendMessage);
router.get("/my-messages", protect, getMyMessages);
router.get("/unread-count", protect, getUnreadCount);

// Admin routes
router.get("/conversations", protect, isAdmin, getAllConversations);
router.get("/conversations/:conversationId", protect, isAdmin, getConversationMessages);
// Get messages by orderId (for both admin and user)
router.get("/order/:orderId", protect, getMessagesByOrderId);
// Route xóa tin nhắn - dùng pattern giống các route khác
router.delete("/:messageId", protect, isAdmin, deleteMessage);
// Admin: update message/file sent time
router.put("/:messageId/timestamp", protect, isAdmin, updateMessageTimestamp);

module.exports = router;

