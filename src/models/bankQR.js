const mongoose = require("mongoose");

const BankQRSchema = new mongoose.Schema(
  {
    code: { 
      type: String, 
      required: true, 
      unique: true,
      trim: true 
    }, // Mã ngân hàng (vietin, bidv_hieu, ocb_ca, ...)
    name: { 
      type: String, 
      required: true,
      trim: true 
    }, // Tên hiển thị
    bin: { 
      type: String, 
      trim: true 
    }, // BIN code
    accountNo: { 
      type: String, 
      trim: true 
    }, // Số tài khoản
    accountName: { 
      type: String, 
      trim: true 
    }, // Tên chủ tài khoản
    qrImage: { 
      type: String, 
      trim: true 
    }, // Đường dẫn QR image
    isVisible: { 
      type: Boolean, 
      default: true 
    }, // Trạng thái ẩn/hiện (true = hiển thị, false = ẩn)
    updatedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    } // Admin cập nhật
  },
  { timestamps: true }
);

module.exports = mongoose.model("BankQR", BankQRSchema);
