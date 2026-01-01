const { getContentFromData } = require("../utils/getContentFromData");

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
      const contentFromData = getContentFromData(Number(amount), "in");
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

    res.status(200).json({ 
      imageUrl,
      accountName: accountName || "",
      accountNo: accountNo || "",
      phone: phone || "",
      bank: bank.toLowerCase(),
      amount: Number(amount),
      content: transferContent, // Nội dung: từ file JSON nếu có, hoặc mặc định nếu không
      isContentFromData // true nếu lấy từ file JSON, false nếu dùng mặc định
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate QR", error: error.message });
  }
};

module.exports = { getVietQr };


