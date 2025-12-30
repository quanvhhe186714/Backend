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
      // MB Bank - SePay Account
      bin = process.env.MB_BANK_BIN || "970422"; // MB Bank BIN code
      accountNo = process.env.MB_BANK_ACCOUNT || process.env.SEPAY_ACCOUNT_NO || "77891011121314";
      accountName = process.env.MB_BANK_ACCOUNT_NAME || process.env.SEPAY_ACCOUNT_NAME || "TRAN DANG LINH";
      phone = process.env.MB_BANK_PHONE || "";
    } else {
      // Fallback về MB Bank nếu không khớp
      bin = process.env.MB_BANK_BIN || "970422";
      accountNo = process.env.MB_BANK_ACCOUNT || process.env.SEPAY_ACCOUNT_NO || "77891011121314";
      accountName = process.env.MB_BANK_ACCOUNT_NAME || process.env.SEPAY_ACCOUNT_NAME || "TRAN DANG LINH";
      phone = process.env.MB_BANK_PHONE || "";
    }

    if (!accountNo) {
      return res.status(400).json({
        message: "Bank account is not configured. Please set bank account in environment.",
      });
    }

    // Nội dung mặc định nếu không có
    const transferContent = content || "MMOS";

    // Log để debug (có thể xóa sau)
    console.log("🔍 QR Code Config:", {
      accountNo,
      accountName,
      bin,
      amount,
      content: transferContent,
      env: {
        MB_BANK_ACCOUNT: process.env.MB_BANK_ACCOUNT,
        MB_BANK_ACCOUNT_NAME: process.env.MB_BANK_ACCOUNT_NAME,
        SEPAY_ACCOUNT_NO: process.env.SEPAY_ACCOUNT_NO,
        SEPAY_ACCOUNT_NAME: process.env.SEPAY_ACCOUNT_NAME,
      }
    });

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


