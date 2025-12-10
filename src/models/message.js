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
      trim: true,
      default: ""
    },
    attachments: {
      type: [
      {
        url: { type: String, required: true },
        originalName: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        type: {
          type: String,
          enum: ["image", "file"],
          default: "file"
        }
      }
    ],
      default: []
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
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null, // Optional: link message to a specific order
      index: true
    },
    createdAt: { type: Date, immutable: false },
    updatedAt: { type: Date }
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

