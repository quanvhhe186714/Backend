const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null // null = gửi cho admin/page
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    isRead: {
      type: Boolean,
      default: false
    },
    isFromAdmin: {
      type: Boolean,
      default: false
    },
    conversationId: {
      type: String,
      required: true,
      index: true
    }
  },
  { timestamps: true }
);

// Tạo conversationId từ sender và receiver (fallback nếu chưa được set trong controller)
MessageSchema.pre("save", function(next) {
  if (!this.conversationId) {
    if (!this.receiver) {
      // User gửi cho admin (receiver = null)
      this.conversationId = `admin_${this.sender.toString()}`;
    } else {
      // Chat giữa 2 người - conversationId sẽ được set trong controller
      // Nếu không có, tạo từ sender và receiver
      const ids = [this.sender.toString(), this.receiver.toString()].sort();
      this.conversationId = ids.join("_");
    }
  }
  next();
});

module.exports = mongoose.model("Message", MessageSchema);

