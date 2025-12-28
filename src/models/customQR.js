const mongoose = require("mongoose");

const CustomQRSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // Tên QR code
    imageUrl: { type: String, required: true }, // URL QR code đã upload (Cloudinary)
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" }, // Link đến order (optional)
    transactionCode: { type: String, trim: true }, // Mã giao dịch
    content: { type: String, trim: true }, // Nội dung chuyển khoản
    amount: { type: Number }, // Số tiền
    bank: { type: String, default: "mb" }, // Ngân hàng (mb, vietinbank, momo)
    accountName: { type: String, trim: true }, // Tên chủ tài khoản
    accountNo: { type: String, trim: true }, // Số tài khoản
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Admin tạo QR
    isActive: { type: Boolean, default: true }, // Trạng thái active
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model("CustomQR", CustomQRSchema);

