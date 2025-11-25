const buildVietQrImageUrl = ({ bin, accountNo, accountName, amount, content }) => {
  const base = `https://img.vietqr.io/image/${encodeURIComponent(bin)}-${encodeURIComponent(accountNo)}-compact2.png`;
  const params = new URLSearchParams();
  if (amount && Number(amount) > 0) params.set("amount", String(Math.floor(Number(amount))));
  if (content) params.set("addInfo", content);
  if (accountName) params.set("accountName", accountName);
  return `${base}?${params.toString()}`;
};

// GET /payments/qr?amount=100000&content=MMOS-ORDER123&bank=vietinbank (optional: vietinbank, momo)
const getVietQr = async (req, res) => {
  try {
    const { amount, content, bank = "vietinbank" } = req.query;
    
    // Cấu hình ngân hàng
    let bin, accountNo, accountName, phone;
    const bankLower = bank.toLowerCase();
    
    if (bankLower === "momo") {
      // MoMo
      bin = process.env.MOMO_BIN || "970422"; // MoMo BIN code
      accountNo = process.env.MOMO_ACCOUNT || "0392728529";
      accountName = process.env.MOMO_ACCOUNT_NAME || "VŨ HỒNG QUÂN";
      phone = process.env.MOMO_PHONE || "0392728529";
    } else if (bankLower === "vietinbank" || bankLower === "viettinbank") {
      // VietinBank
      bin = process.env.VIETINBANK_BIN || "970415"; // VietinBank BIN code
      accountNo = process.env.VIETINBANK_ACCOUNT || "107876717017";
      accountName = process.env.VIETINBANK_ACCOUNT_NAME || "VU HONG QUAN";
      phone = process.env.VIETINBANK_PHONE || "";
    } else {
      // Fallback về VietinBank nếu không khớp
      bin = process.env.VIETINBANK_BIN || "970415";
      accountNo = process.env.VIETINBANK_ACCOUNT || "107876717017";
      accountName = process.env.VIETINBANK_ACCOUNT_NAME || "VU HONG QUAN";
      phone = process.env.VIETINBANK_PHONE || "";
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


