const { getContentFromData } = require("../utils/getContentFromData");
const Wallet = require("../models/wallet");
const Transaction = require("../models/transaction");

const buildVietQrImageUrl = ({ bin, accountNo, accountName, amount, content }) => {
  const base = `https://img.vietqr.io/image/${encodeURIComponent(bin)}-${encodeURIComponent(accountNo)}-compact2.png`;
  const params = new URLSearchParams();
  if (amount && Number(amount) > 0) params.set("amount", String(Math.floor(Number(amount))));
  if (content) params.set("addInfo", content);
  if (accountName) params.set("accountName", accountName);
  return `${base}?${params.toString()}`;
};

// GET /payments/qr?amount=100000&content=MMOS-ORDER123&bank=mb (optional: mb, mbbank, mb bank)
const getVietQr = async (req, res) => {
  try {
    const { amount, content, bank = "vietin" } = req.query;
    
    // Cấu hình ngân hàng
    let bin, accountNo, accountName, phone;
    const bankLower = bank.toLowerCase();
    
    if (bankLower === "vietin" || bankLower === "vietinbank" || bankLower === "vtb") {
      // VietinBank
      bin = process.env.VIETIN_BANK_BIN || "970415"; // VietinBank BIN
      accountNo = process.env.VIETIN_BANK_ACCOUNT || "107876717017";
      accountName = process.env.VIETIN_BANK_ACCOUNT_NAME || "VU HONG QUAN";
      phone = process.env.VIETIN_BANK_PHONE || "";
    } else if (bankLower === "hd" || bankLower === "hdbank" || bankLower === "hdb" || bankLower === "hd-bank") {
      // HDBank
      bin = process.env.HD_BANK_BIN || "970437";
      accountNo = process.env.HD_BANK_ACCOUNT || "082704070007936";
      accountName = process.env.HD_BANK_ACCOUNT_NAME || "LE VAN HA";
      phone = process.env.HD_BANK_PHONE || "";
    } else if (bankLower === "bidv_hieu") {
      bin = process.env.BIDV_HIEU_BIN || "970418";
      accountNo = process.env.BIDV_HIEU_ACCOUNT || "8871752191";
      accountName = process.env.BIDV_HIEU_ACCOUNT_NAME || "VO MINH HIEU";
      phone = process.env.BIDV_HIEU_PHONE || "";
    } else if (bankLower === "bidv") {
      // BIDV
      bin = process.env.BIDV_BANK_BIN || "970418";
      accountNo = process.env.BIDV_BANK_ACCOUNT || "8835915459";
      accountName = process.env.BIDV_BANK_ACCOUNT_NAME || "HONG CON BINH";
      phone = process.env.BIDV_BANK_PHONE || "";
    } else {
      // Fallback về VietinBank nếu không khớp
      bin = process.env.VIETIN_BANK_BIN || "970415";
      accountNo = process.env.VIETIN_BANK_ACCOUNT || "107876717017";
      accountName = process.env.VIETIN_BANK_ACCOUNT_NAME || "VU HONG QUAN";
      phone = process.env.MB_BANK_PHONE || "";
    }

    if (!accountNo) {
      return res.status(400).json({
        message: "Bank account is not configured. Please set bank account in environment.",
      });
    }

    // Validate số tiền bắt buộc
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        message: "Vui lòng cung cấp số tiền hợp lệ",
      });
    }

    // Tự động lấy nội dung từ file JSON nếu có số tiền nhưng chưa có content
    let transferContent = content || "";
    let isContentFromData = false;
    
    // Nếu có số tiền nhưng chưa có content, tự động tìm trong file nhập khoản_history.json
    if (amount && Number(amount) > 0 && !transferContent) {
      const contentFromData = getContentFromData(Number(amount), "in", accountNo);
      if (contentFromData) {
        transferContent = contentFromData;
        isContentFromData = true;
        console.log(`Đã tự động lấy nội dung từ file nhập khoản_history.json cho số tiền: ${amount}`);
      }
    }
    
    // Nếu không tìm thấy trong file JSON, dùng nội dung mặc định (không quan trọng)
    if (!transferContent) {
      transferContent = `THANHTOAN${Date.now()}`; // Nội dung mặc định, có thể là gì cũng được
      console.log(`Số tiền ${amount} không có trong file JSON, sử dụng nội dung mặc định`);
    }

    const imageUrl = buildVietQrImageUrl({
      bin,
      accountNo,
      accountName,
      amount,
      content: transferContent,
    });

        // ✅ Tạo Transaction "pending" ngay khi tạo QR
    // Yêu cầu: route này đã có `protect` => req.user tồn tại
    let transaction = null;
    try {
      // Đảm bảo user có wallet
      let wallet = await Wallet.findOne({ user: req.user._id });
      if (!wallet) {
        wallet = await Wallet.create({ user: req.user._id });
      }

      // Nếu referenceCode trùng, thêm hậu tố thời gian
      let referenceCode = transferContent;
      const duplicated = await Transaction.findOne({ referenceCode });
      if (duplicated) {
        referenceCode = `${referenceCode}-${Date.now().toString().slice(-4)}`;
      }

      transaction = await Transaction.create({
        user: req.user._id,
        wallet: wallet._id,
        amount: Number(amount),
        method: "bank_transfer",
        bank: bankLower,
        referenceCode,
        note: transferContent,
        status: "pending",
      });
    } catch (e) {
      console.error("[Transaction] Failed to create pending transaction:", e);
    }

    res.status(200).json({
      imageUrl,
      accountName: accountName || "",
      accountNo: accountNo || "",
      phone: phone || "",
      bank: bankLower,
      amount: Number(amount),
      content: transferContent,
      isContentFromData,
      transactionId: transaction?._id || null,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate QR", error: error.message });
  }
};

module.exports = { getVietQr };


