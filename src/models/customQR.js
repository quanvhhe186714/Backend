const mongoose = require("mongoose");

const CustomQRSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true }, // Tên QR code (không còn bắt buộc)
    imageUrl: { type: String }, // URL QR code đã upload (Cloudinary) – không bắt buộc
    orderId: {
      type: mongoose.Schema.Types.Mixed, // Cho phép cả String và ObjectId
      ref: "Order",
      validate: {
        validator: function (v) {
          // Cho phép null, undefined, ObjectId hợp lệ, hoặc string bất kỳ
          if (v === null || v === undefined || v === "") return true;
          if (mongoose.Types.ObjectId.isValid(v)) return true;
          // Cho phép string bất kỳ
          return typeof v === "string";
        },
        message: "orderId phải là ObjectId hợp lệ hoặc string",
      },
    }, // Link đến order (optional) - có thể là ObjectId hoặc string
    transactionCode: { type: String, trim: true }, // Mã giao dịch - tự do
    content: { type: String, trim: true }, // Nội dung chuyển khoản - tự do
    amount: { type: Number }, // Số tiền
    bank: { type: String, trim: true }, // Ngân hàng (không giới hạn)
    accountName: { type: String, trim: true }, // Tên chủ tài khoản - yêu cầu phía client
    accountNo: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          // Nếu có giá trị, chỉ cho phép số (0-9)
          if (!v || v === "") return true; // Cho phép rỗng
          return /^[0-9]+$/.test(v);
        },
        message: "Số tài khoản chỉ được chứa số (0-9)",
      },
    }, // Số tài khoản - chỉ số
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Admin tạo QR
    isActive: { type: Boolean, default: true }, // Trạng thái active
    isPublished: { type: Boolean, default: false }, // QR đang được publish lên trang thanh toán
    publishedAt: { type: Date }, // Thời gian publish
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Admin publish QR
  },
  { timestamps: true }
);

module.exports = mongoose.model("CustomQR", CustomQRSchema);
