const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" }, // Optional for services
        serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "FacebookService" }, // For services
        type: { type: String, enum: ["product", "service"], default: "product" }, // product or service
        name: { type: String }, // Snapshot of name at time of purchase
        price: { type: Number }, // Snapshot of price at time of purchase
        quantity: { type: Number, default: 1 },
        durationMonths: { type: Number }, // snapshot of duration for expiry calculation (products only)
        // Service-specific fields
        serviceQuantity: { type: Number }, // Số lượng dịch vụ (ví dụ: 5000 likes)
        serviceUnit: { type: String }, // Đơn vị (ví dụ: "1000")
        serviceUnitLabel: { type: String }, // Nhãn đơn vị (ví dụ: "lượt like")
        serviceUrls: { type: Object }, // URLs từ requiredFields
        serviceServer: { type: Object }, // Server được chọn
        serviceEmotion: { type: String }, // Cảm xúc được chọn (nếu có)
        serviceType: { type: String } // Loại dịch vụ (facebook_service, etc.)
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
    paymentDetails: { type: Object }, // Store transaction ID etc.
    walletCharged: { type: Boolean, default: false },
    invoicePath: { type: String } // Relative path to generated invoice file
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
