const mongoose = require("mongoose");
const Message = require("../models/message");
const User = require("../models/users");
const Order = require("../models/order");
const { generateResponse } = require("../services/geminiService");

// Gửi tin nhắn (user gửi cho admin hoặc admin gửi cho user)
const sendMessage = async (req, res) => {
  try {
    const { content, receiverId, orderId } = req.body;
    const files = req.files || [];
    const hasText = content && content.trim();
    const hasAttachments = files.length > 0;
    
    if (!hasText && !hasAttachments) {
      return res.status(400).json({ message: "Tin nhắn phải có nội dung hoặc tệp đính kèm" });
    }

    const senderId = req.user._id || req.user.id;
    const sender = await User.findById(senderId);
    
    if (!sender) {
      return res.status(404).json({ message: "Người gửi không tồn tại" });
    }

    // Validate orderId if provided
    let order = null;
    if (orderId) {
      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({ message: "ID đơn hàng không hợp lệ" });
      }
      order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Đơn hàng không tồn tại" });
      }
      // Verify order belongs to the user (if not admin)
      if (sender.role !== "admin" && order.user.toString() !== senderId.toString()) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập đơn hàng này" });
      }
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

    const attachments = files.map((file) => ({
      // Ưu tiên dùng Cloudinary URL (cho Render), fallback về local path (cho dev)
      url: file.cloudinaryUrl || `/uploads/chat/${file.filename}`,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      type: file.mimetype.startsWith("image/") ? "image" : "file"
    }));

    const message = new Message({
      sender: senderId,
      receiver: receiverId || null, // null = gửi cho admin/page
      content: hasText ? content.trim() : "",
      isFromAdmin,
      conversationId, // Set trực tiếp để đảm bảo đúng
      attachments,
      orderId: orderId || null
    });

    await message.save();
    
    // Nếu admin gửi file trong chat, tự động liên kết với đơn hàng
    if (isFromAdmin && hasAttachments && attachments.length > 0) {
      try {
        let targetOrder = null;
        
        // Nếu có orderId được chỉ định, dùng order đó
        if (orderId && order) {
          targetOrder = order;
        } 
        // Nếu không có orderId: tự tìm đơn sớm nhất chưa giao
        else if (receiverId && receiver) {
          // 1) Đơn hàng pending hoặc paid cũ nhất
          targetOrder = await Order.findOne({
            user: receiverId,
            status: { $in: ["pending", "paid"] },
            isDeleted: { $ne: true }
          }).sort({ createdAt: 1 });

          // 2) Nếu không còn pending/paid, fallback lấy đơn delivered/completed mới nhất (để lưu file dù đã giao)
          if (!targetOrder) {
            targetOrder = await Order.findOne({
              user: receiverId,
              status: { $in: ["delivered", "completed", "paid"] },
              isDeleted: { $ne: true }
            }).sort({ createdAt: -1 });
          }
        }
        
        // Nếu tìm thấy đơn hàng, cập nhật orderId cho message để liên kết file với đơn hàng
        if (targetOrder) {
          message.orderId = targetOrder._id;
          await message.save();
          console.log(`📦 Tự động liên kết file với đơn hàng ${targetOrder._id} của user ${receiverId || orderId}`);
        }
        
        // Xử lý file: chỉ cập nhật invoicePath nếu file RÕ RÀNG là invoice
        // Tất cả file (kể cả file thứ 2, 3...) đều được lưu trong message và hiển thị như file của người bán
        if (targetOrder && ["paid", "completed", "delivered"].includes(targetOrder.status)) {
          // Phân loại file: invoice vs file của người bán
          const invoiceFiles = [];
          const sellerFiles = [];
          
          attachments.forEach(file => {
            const isPDF = file.mimeType === "application/pdf" || 
                         file.originalName.toLowerCase().endsWith(".pdf");
            
            if (isPDF) {
              const urlLower = file.url.toLowerCase();
              const nameLower = file.originalName.toLowerCase();
              
              // Chỉ coi là invoice nếu:
              // 1. Có "invoice" trong tên file hoặc đường dẫn
              // 2. Hoặc nằm trong thư mục /invoices/ (local) hoặc mmos/invoices (Cloudinary)
              if (urlLower.includes("invoice") || 
                  nameLower.includes("invoice") ||
                  urlLower.includes("/invoices/") ||
                  urlLower.includes("mmos/invoices")) {
                invoiceFiles.push(file);
              } else {
                // PDF nhưng không phải invoice - là file của người bán
                sellerFiles.push(file);
              }
            } else {
              // File không phải PDF - là file của người bán
              sellerFiles.push(file);
            }
          });
          
          // Xử lý invoice: chỉ cập nhật invoicePath nếu chưa có
          if (invoiceFiles.length > 0) {
            const firstInvoice = invoiceFiles[0];
            if (!targetOrder.invoicePath) {
              targetOrder.invoicePath = firstInvoice.url;
              await targetOrder.save();
              console.log(`✅ Đã cập nhật invoicePath cho đơn hàng ${targetOrder._id}: ${firstInvoice.url}`);
            } else {
              console.log(`⚠️ Đơn hàng ${targetOrder._id} đã có invoice tự động, không ghi đè bằng file admin gửi`);
            }
          }
          
          // Tất cả file (invoice và seller files) đều được lưu trong message.attachments
          // và sẽ hiển thị ở phần "Files từ người bán" (trừ file invoice đã được dùng cho invoicePath)
          if (sellerFiles.length > 0) {
            console.log(`📎 Đã lưu ${sellerFiles.length} file của người bán cho đơn hàng ${targetOrder._id}`);
          }
        }
      } catch (error) {
        // Không fail request nếu cập nhật invoice thất bại
        console.error("Lỗi khi xử lý file:", error);
      }
    }
    
    // Populate sender info
    await message.populate("sender", "name email avatar role");
    if (receiver) {
      await message.populate("receiver", "name email avatar");
    }

    // Auto-reply với AI nếu user (không phải admin) gửi tin nhắn có text
    if (!isFromAdmin && hasText && conversationId) {
      // Chạy async, không block response
      (async () => {
        try {
          // Lấy admin user để dùng làm sender cho tin nhắn AI
          const adminUser = await User.findOne({ role: "admin" });
          if (!adminUser) {
            console.warn("No admin user found for AI auto-reply");
            return;
          }

          // Tin nhắn AI mặc định
          const defaultMessage = "Xin chào! Cảm ơn bạn đã liên hệ. Chúng tôi đã nhận được tin nhắn của bạn và sẽ phản hồi sớm nhất có thể. Nếu cần hỗ trợ khẩn cấp, vui lòng liên hệ trực tiếp với admin.";

          // Kiểm tra xem admin đã trả lời trong 10 phút gần nhất không (không tính tin nhắn AI mặc định)
          const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
          const recentAdminMessage = await Message.findOne({
            conversationId: conversationId,
            isFromAdmin: true,
            sender: adminUser._id,
            createdAt: { $gte: tenMinutesAgo },
            content: { $ne: defaultMessage } // Loại trừ tin nhắn AI mặc định
          }).sort({ createdAt: -1 });

          // Nếu admin đã trả lời trong 10 phút gần nhất → AI không trả lời
          if (recentAdminMessage) {
            console.log(`⏸️ AI: Admin đã trả lời trong 10 phút gần nhất, AI không trả lời.`);
            return;
          }

          // Tạo tin nhắn AI mặc định ngay lập tức
          const aiMessage = new Message({
            sender: adminUser._id,
            receiver: senderId,
            content: defaultMessage,
            isFromAdmin: true,
            isFake: false, // Tin nhắn thật từ AI
            conversationId: conversationId,
            orderId: orderId || null
          });

          await aiMessage.save();
          console.log(`✅ AI: Đã gửi tin nhắn mặc định cho user ${senderId} trong conversation ${conversationId}`);

          // Sau 10 phút, nếu admin chưa trả lời, AI sẽ trả lời lại bằng Gemini (nếu có)
          setTimeout(async () => {
            try {
              // Kiểm tra lại xem admin đã trả lời chưa (không tính tin nhắn AI mặc định)
              const checkTime = new Date(Date.now() - 10 * 60 * 1000);
              const adminReplied = await Message.findOne({
                conversationId: conversationId,
                isFromAdmin: true,
                sender: adminUser._id,
                createdAt: { $gte: checkTime },
                content: { $ne: defaultMessage } // Loại trừ tin nhắn AI mặc định
              });

              // Nếu admin chưa trả lời sau 10 phút, AI trả lời bằng Gemini
              if (!adminReplied && process.env.GEMINI_API_KEY) {
                // Lấy conversation history (không bao gồm tin nhắn AI mặc định vừa tạo)
                const history = await Message.find({ 
                  conversationId: conversationId,
                  _id: { $ne: aiMessage._id } // Loại bỏ tin nhắn AI mặc định
                })
                  .sort({ createdAt: -1 })
                  .limit(20)
                  .select("content isFromAdmin createdAt")
                  .lean();
                history.reverse();

                // Gọi Gemini API để tạo phản hồi thông minh hơn
                const aiResponse = await generateResponse(
                  content.trim(),
                  history,
                  orderId || null
                );

                if (aiResponse && aiResponse.trim() && aiResponse.trim() !== defaultMessage) {
                  // Tạo tin nhắn AI thông minh hơn
                  const smartAiMessage = new Message({
                    sender: adminUser._id,
                    receiver: senderId,
                    content: aiResponse.trim(),
                    isFromAdmin: true,
                    isFake: false,
                    conversationId: conversationId,
                    orderId: orderId || null
                  });

                  await smartAiMessage.save();
                  console.log(`✅ AI: Đã gửi tin nhắn thông minh (Gemini) cho user ${senderId} sau 10 phút`);
                }
              }
            } catch (error) {
              console.error("Error in delayed AI reply:", error);
            }
          }, 10 * 60 * 1000); // 10 phút

        } catch (error) {
          // Không fail request nếu AI auto-reply thất bại
          console.error("Error in AI auto-reply:", error);
        }
      })();
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

// Lấy tin nhắn theo orderId (để xem file đã gửi cho đơn hàng)
const getMessagesByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id || req.user.id;
    const isAdmin = req.user.role === "admin";
    
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "ID đơn hàng không hợp lệ" });
    }

    // Verify order exists and user has access
    const Order = require("../models/order");
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Đơn hàng không tồn tại" });
    }

    // Check access: admin or order owner
    if (!isAdmin && order.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Bạn không có quyền truy cập đơn hàng này" });
    }

    // Get messages with this orderId
    const messages = await Message.find({ orderId })
      .populate("sender", "name email avatar role")
      .populate("receiver", "name email avatar")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error getting messages by orderId:", error);
    res.status(500).json({ message: "Lỗi khi lấy tin nhắn", error: error.message });
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

// Admin: Create fake message
const createFakeMessage = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chỉ admin mới được tạo tin nhắn ảo" });
    }

    const { content, senderName, senderAvatar, conversationId, orderId, createdAt } = req.body;

    if (!content || !conversationId) {
      return res.status(400).json({ message: "Nội dung và conversationId là bắt buộc" });
    }

    // Validate conversationId format
    if (!conversationId.startsWith('admin_')) {
      return res.status(400).json({ message: "conversationId phải bắt đầu bằng 'admin_'" });
    }

    // Extract userId from conversationId (format: admin_<userId>)
    const userId = conversationId.replace('admin_', '');
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "conversationId không hợp lệ" });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // Validate orderId if provided
    if (orderId) {
      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({ message: "ID đơn hàng không hợp lệ" });
      }
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Đơn hàng không tồn tại" });
      }
    }

    // Create a fake user for the sender if senderName is provided
    let fakeSenderId = userId; // Default to the conversation user
    if (senderName) {
      // Try to find or create a fake user with the given name
      let fakeUser = await User.findOne({ name: senderName, role: { $ne: 'admin' } });
      if (!fakeUser) {
        // Create a temporary fake user (you might want to mark these differently)
        fakeUser = new User({
          name: senderName,
          email: `fake_${Date.now()}@fake.com`,
          password: 'fake', // Won't be used
          role: 'customer',
          avatar: senderAvatar || null
        });
        await fakeUser.save();
      }
      fakeSenderId = fakeUser._id;
    }

    const message = new Message({
      sender: fakeSenderId,
      receiver: null,
      content: content.trim(),
      isFromAdmin: false, // Fake messages appear as from customer
      isFake: true,
      conversationId,
      orderId: orderId || null,
      createdAt: createdAt ? new Date(createdAt) : new Date(),
      updatedAt: createdAt ? new Date(createdAt) : new Date()
    });

    await message.save();
    await message.populate("sender", "name email avatar role");

    res.status(201).json({
      message: "Tạo tin nhắn ảo thành công",
      fakeMessage: message
    });
  } catch (error) {
    console.error("Error creating fake message:", error);
    res.status(500).json({ 
      message: "Lỗi server khi tạo tin nhắn ảo", 
      error: error.message 
    });
  }
};

// Admin: Get all fake messages
const getAllFakeMessages = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chỉ admin mới được xem tin nhắn ảo" });
    }

    const { conversationId, orderId } = req.query;
    let query = { isFake: true };

    if (conversationId) {
      query.conversationId = conversationId;
    }

    if (orderId) {
      query.orderId = orderId;
    }

    const fakeMessages = await Message.find(query)
      .populate("sender", "name email avatar role")
      .populate("receiver", "name email avatar")
      .sort({ createdAt: -1 });

    res.status(200).json(fakeMessages);
  } catch (error) {
    console.error("Error getting fake messages:", error);
    res.status(500).json({ 
      message: "Lỗi server khi lấy tin nhắn ảo", 
      error: error.message 
    });
  }
};

// Admin: Delete fake message
const deleteFakeMessage = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chỉ admin mới được xóa tin nhắn ảo" });
    }

    const { messageId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: "ID tin nhắn không hợp lệ" });
    }

    const fakeMessage = await Message.findOne({ _id: messageId, isFake: true });
    if (!fakeMessage) {
      return res.status(404).json({ message: "Không tìm thấy tin nhắn ảo" });
    }

    await Message.findByIdAndDelete(messageId);

    res.status(200).json({ 
      message: "Đã xóa tin nhắn ảo thành công",
      deletedMessageId: messageId
    });
  } catch (error) {
    console.error("Error deleting fake message:", error);
    res.status(500).json({ 
      message: "Lỗi server khi xóa tin nhắn ảo", 
      error: error.message 
    });
  }
};

// Admin: update message timestamp (affects attachment "sentAt" display)
const updateMessageTimestamp = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { sentAt } = req.body;

    if (!sentAt) {
      return res.status(400).json({ message: "Thiếu thời gian gửi" });
    }

    const parsedDate = new Date(sentAt);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: "Thời gian không hợp lệ" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Tin nhắn không tồn tại" });
    }

    // Only allow updating admin messages (files from seller/admin)
    if (!message.isFromAdmin) {
      return res.status(403).json({ message: "Chỉ chỉnh được tin nhắn từ admin" });
    }

    const updated = await Message.findOneAndUpdate(
      { _id: messageId, isFromAdmin: true },
      {
        $set: {
          createdAt: parsedDate,
          updatedAt: parsedDate
        }
      },
      {
        new: true,
        timestamps: false,
        strict: false
      }
    ).lean();

    if (!updated) {
      return res.status(404).json({ message: "Không tìm thấy tin nhắn admin để cập nhật" });
    }

    res.status(200).json(updated);
  } catch (error) {
    console.error("Error updating message timestamp:", error);
    res.status(500).json({ message: "Lỗi khi cập nhật thời gian", error: error.message });
  }
};

module.exports = {
  sendMessage,
  getMyMessages,
  getAllConversations,
  getConversationMessages,
  getUnreadCount,
  getMessagesByOrderId,
  deleteMessage,
  updateMessageTimestamp,
  createFakeMessage,
  getAllFakeMessages,
  deleteFakeMessage
};

