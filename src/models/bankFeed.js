const mongoose = require("mongoose");

/*
 * BankFeed: lưu các giao dịch import thủ công từ lịch sử BIDV
 * Không liên quan tới User / Wallet để tránh ràng buộc.
 */
const BankFeedSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["in", "out"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    note: {
      type: String,
      default: "",
    },
    createdAt: {
      type: Date,
      required: true,
    },
  },
  {
    versionKey: false,
    timestamps: false, // giữ nguyên createdAt từ file gốc
    collection: "bankfeeds",
  }
);

module.exports = mongoose.model("BankFeed", BankFeedSchema);

