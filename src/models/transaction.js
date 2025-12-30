const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    method: {
      type: String,
      enum: ["bank_transfer", "momo", "cash"],
      default: "bank_transfer",
    },
    bank: {
      type: String,
      default: "mb",
    },
    referenceCode: {
      type: String,
      unique: true,
      required: true,
    },
    note: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    confirmedAt: {
      type: Date,
    },
    isDeleted: { type: Boolean, default: false }, // Soft delete flag
    deletedAt: { type: Date }, // When was it deleted
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Who deleted it
    customQRId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "CustomQR",
      default: null 
    }, // Link to CustomQR if payment was made via custom QR
    paymentDetails: {
      type: Object,
      default: {}
    } // Store additional payment info (SePay transaction ID, account info, etc.)
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", TransactionSchema);

