const mongoose = require("mongoose");
const Message = require("../models/message");
const User = require("../models/users");

// Gửi tin nhắn (user gửi cho admin hoặc admin gửi cho user)
const sendMessage = async (req, res) => {
  try {
    const { content, receiverId } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Nội dung tin nhắn không được để trống" });
    }

    const senderId = req.user._id || req.user.id;
    const sender = await User.findById(senderId);
    
    if (!sender) {
      return res.status(404).json({ message: "Người gửi không tồn tại" });
    }

    // Nếu là admin gửi cho user cụ thể
    let receiver = null;
    let isFromAdmin = sender.role === "admin";
    let conversationId = null;
    
    if (receiverId && isFromAdmin) {
      receiver = await User.findById(receiverId);
      if (!receiver) {
        return res.status(404).json({ message: "Người nhận không tồn tại" });
      }
      // Admin gửi cho user - dùng conversationId của user đó
      conversationId = `admin_${receiverId}`;
    } else if (!receiverId) {
      // User gửi cho admin (receiver = null)
      conversationId = `admin_${senderId}`;
    }

    const message = new Message({
      sender: senderId,
      receiver: receiverId || null, // null = gửi cho admin/page
      content: content.trim(),
      isFromAdmin,
      conversationId // Set trực tiếp để đảm bảo đúng
    });

    await message.save();
    
    // Populate sender info
    await message.populate("sender", "name email avatar role");
    if (receiver) {
      await message.populate("receiver", "name email avatar");
    }

    res.status(201).json(message);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Lỗi khi gửi tin nhắn", error: error.message });
  }
};

// Lấy danh sách tin nhắn của user (conversation với admin)
const getMyMessages = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const conversationId = `admin_${userId}`;
    
    const messages = await Message.find({ conversationId })
      .populate("sender", "name email avatar role")
      .populate("receiver", "name email avatar")
      .sort({ createdAt: 1 });

    // Đánh dấu tin nhắn chưa đọc là đã đọc (tin nhắn không phải từ user này)
    await Message.updateMany(
      { 
        conversationId, 
        isRead: false, 
        sender: { $ne: userId },
        isFromAdmin: true 
      },
      { isRead: true }
    );

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error getting messages:", error);
    res.status(500).json({ message: "Lỗi khi lấy tin nhắn", error: error.message });
  }
};

// Admin: Lấy tất cả conversations
const getAllConversations = async (req, res) => {
  try {
    // Lấy tất cả conversations với admin (conversationId bắt đầu bằng "admin_")
    const conversations = await Message.aggregate([
      { $match: { conversationId: { $regex: /^admin_/ } } },
      {
        $group: {
          _id: "$conversationId",
          lastMessage: { $last: "$$ROOT" },
          unreadCount: {
            $sum: { 
              $cond: [
                { $and: [
                  { $eq: ["$isRead", false] }, 
                  { $eq: ["$isFromAdmin", false] }
                ]}, 
                1, 
                0
              ] 
            }
          },
          senderId: { 
            $first: {
              $cond: [
                { $eq: ["$isFromAdmin", false] },
                "$sender",
                "$receiver"
              ]
            }
          }
        }
      },
      { $sort: { "lastMessage.createdAt": -1 } }
    ]);

    // Populate sender info
    const populatedConversations = await Promise.all(
      conversations.map(async (conv) => {
        try {
          // Lấy userId từ conversationId (format: admin_<userId>)
          const userId = conv._id.replace("admin_", "");
          if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            console.warn(`Invalid conversationId: ${conv._id}`);
            return null;
          }
          
          const sender = await User.findById(userId).select("_id name email avatar");
          
          let lastMsg = null;
          if (conv.lastMessage._id) {
            try {
              lastMsg = await Message.findById(conv.lastMessage._id)
                .populate("sender", "name email avatar role");
            } catch (err) {
              console.warn(`Could not populate last message: ${err.message}`);
            }
          }
          
          return {
            conversationId: conv._id,
            sender: sender ? {
              _id: sender._id,
              name: sender.name,
              email: sender.email,
              avatar: sender.avatar
            } : { _id: userId, name: "Unknown", email: "", avatar: "" },
            lastMessage: {
              _id: lastMsg?._id || conv.lastMessage._id,
              content: lastMsg?.content || conv.lastMessage.content || "",
              createdAt: lastMsg?.createdAt || conv.lastMessage.createdAt || new Date()
            },
            unreadCount: conv.unreadCount || 0,
            lastMessageTime: conv.lastMessage.createdAt || new Date()
          };
        } catch (error) {
          console.error(`Error processing conversation ${conv._id}:`, error);
          return null;
        }
      })
    );

    // Filter out null values
    const validConversations = populatedConversations.filter(conv => conv !== null);

    res.status(200).json(validConversations);
  } catch (error) {
    console.error("Error getting conversations:", error);
    res.status(500).json({ message: "Lỗi khi lấy conversations", error: error.message });
  }
};

// Admin: Lấy tin nhắn của một conversation cụ thể
const getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    const messages = await Message.find({ conversationId })
      .populate("sender", "name email avatar role")
      .populate("receiver", "name email avatar")
      .sort({ createdAt: 1 });

    // Đánh dấu tin nhắn chưa đọc là đã đọc
    await Message.updateMany(
      { conversationId, isRead: false, isFromAdmin: false },
      { isRead: true }
    );

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy tin nhắn", error: error.message });
  }
};

// Đếm số tin nhắn chưa đọc
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const isAdmin = req.user.role === "admin";
    
    let unreadCount = 0;
    
    if (isAdmin) {
      // Admin: đếm tin nhắn từ users chưa đọc (conversationId bắt đầu bằng "admin_")
      unreadCount = await Message.countDocuments({
        conversationId: { $regex: /^admin_/ },
        isRead: false,
        isFromAdmin: false
      });
    } else {
      // User: đếm tin nhắn từ admin chưa đọc
      const conversationId = `admin_${userId}`;
      unreadCount = await Message.countDocuments({
        conversationId,
        isRead: false,
        isFromAdmin: true
      });
    }

    res.status(200).json({ unreadCount });
  } catch (error) {
    console.error("Error getting unread count:", error);
    res.status(500).json({ message: "Lỗi khi đếm tin nhắn", error: error.message });
  }
};

// Admin: Xóa tin nhắn (xóa vĩnh viễn khỏi database)
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id || req.user.id;
    
    console.log(`🗑️ Delete request received - MessageId: ${messageId}, UserId: ${userId}, Role: ${req.user.role}`);
    
    // Validate messageId - tránh conflict với các route khác
    if (!messageId || messageId === "conversations" || messageId === "my-messages" || messageId === "unread-count") {
      console.error(`❌ Invalid messageId (reserved route): ${messageId}`);
      return res.status(400).json({ message: "ID tin nhắn không hợp lệ" });
    }
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      console.error(`❌ Invalid messageId format: ${messageId}`);
      return res.status(400).json({ message: "ID tin nhắn không hợp lệ" });
    }
    
    // Tìm tin nhắn
    const message = await Message.findById(messageId);
    if (!message) {
      console.error(`❌ Message not found: ${messageId}`);
      return res.status(404).json({ message: "Tin nhắn không tồn tại" });
    }

    console.log(`📝 Found message to delete:`, {
      id: message._id,
      content: message.content.substring(0, 50),
      sender: message.sender,
      conversationId: message.conversationId
    });

    // Xóa vĩnh viễn khỏi database
    const deletedMessage = await Message.findByIdAndDelete(messageId);

    if (deletedMessage) {
      console.log(`✅ Đã xóa tin nhắn ID: ${messageId} khỏi database`);
      res.status(200).json({ 
        message: "Đã xóa tin nhắn thành công",
        deletedMessageId: messageId
      });
    } else {
      console.error(`❌ Failed to delete message: ${messageId}`);
      res.status(500).json({ 
        message: "Không thể xóa tin nhắn" 
      });
    }
  } catch (error) {
    console.error("❌ Error deleting message:", error);
    res.status(500).json({ 
      message: "Lỗi khi xóa tin nhắn", 
      error: error.message 
    });
  }
};

module.exports = {
  sendMessage,
  getMyMessages,
  getAllConversations,
  getConversationMessages,
  getUnreadCount,
  deleteMessage
};

