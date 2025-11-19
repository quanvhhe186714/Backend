const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        name: { type: String }, // Snapshot of name at time of purchase
        price: { type: Number }, // Snapshot of price at time of purchase
        quantity: { type: Number, default: 1 },
        durationMonths: { type: Number } // snapshot of duration for expiry calculation
      }
    ],
    totalAmount: { type: Number, required: true }, // Amount AFTER discount
    subTotal: { type: Number }, // Amount BEFORE discount
    discountAmount: { type: Number, default: 0 },
    couponCode: { type: String },
    
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "completed", "cancelled", "delivered"],
      default: "pending"
    },
    paymentMethod: { type: String, default: "bank_transfer" },
    paymentDetails: { type: Object } // Store transaction ID etc.
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
