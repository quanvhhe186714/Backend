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
    const { amount, content, bank = "mb" } = req.query;
    
    // Cấu hình ngân hàng
    let bin, accountNo, accountName, phone;
    const bankLower = bank.toLowerCase();
    
    if (bankLower === "mb" || bankLower === "mbbank" || bankLower === "mb bank") {
      // MB Bank
      bin = process.env.MB_BANK_BIN || "970422"; // MB Bank BIN code
      accountNo = process.env.MB_BANK_ACCOUNT || "39397939686879";
      accountName = process.env.MB_BANK_ACCOUNT_NAME || "NGUYEN THANH NHAN";
      phone = process.env.MB_BANK_PHONE || "";
    } else if (bankLower === "hd" || bankLower === "hdbank" || bankLower === "hdb" || bankLower === "hd-bank") {
      // HDBank
      bin = process.env.HD_BANK_BIN || "970437";
      accountNo = process.env.HD_BANK_ACCOUNT || "082704070007936";
      accountName = process.env.HD_BANK_ACCOUNT_NAME || "LE VAN HA";
      phone = process.env.HD_BANK_PHONE || "";
    } else {
      // Fallback về MB Bank nếu không khớp
      bin = process.env.MB_BANK_BIN || "970422";
      accountNo = process.env.MB_BANK_ACCOUNT || "39397939686879";
      accountName = process.env.MB_BANK_ACCOUNT_NAME || "NGUYEN THANH NHAN";
      phone = process.env.MB_BANK_PHONE || "";
    }

    if (!accountNo) {
      return res.status(400).json({
        message: "Bank account is not configured. Please set bank account in environment.",
      });
    }

    // Nội dung mặc định nếu không có
    const transferContent = content || "MMOS";

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
      bank: bank.toLowerCase()
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate QR", error: error.message });
  }
};

module.exports = { getVietQr };


