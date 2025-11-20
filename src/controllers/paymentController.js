const buildVietQrImageUrl = ({ bin, accountNo, accountName, amount, content }) => {
  const base = `https://img.vietqr.io/image/${encodeURIComponent(bin)}-${encodeURIComponent(accountNo)}-compact2.png`;
  const params = new URLSearchParams();
  if (amount && Number(amount) > 0) params.set("amount", String(Math.floor(Number(amount))));
  if (content) params.set("addInfo", content);
  if (accountName) params.set("accountName", accountName);
  return `${base}?${params.toString()}`;
};

// GET /payments/qr?amount=100000&content=MMOS-ORDER123&bank=mb (optional: mb or cake)
const getVietQr = async (req, res) => {
  try {
    const { amount, content, bank = "mb" } = req.query;
    
    // Cấu hình ngân hàng
    let bin, accountNo, accountName, phone;
    
    if (bank.toLowerCase() === "cake") {
      // CAKE Bank
      bin = process.env.CAKE_BANK_BIN || "970422"; // Có thể cần điều chỉnh BIN của CAKE
      accountNo = process.env.CAKE_BANK_ACCOUNT || "0334443570";
      accountName = process.env.CAKE_BANK_ACCOUNT_NAME || "NGO VAN NAM";
      phone = process.env.CAKE_BANK_PHONE || "";
    } else {
      // MB Bank (mặc định)
      bin = process.env.MB_BANK_BIN || "970422"; // MB Bank BIN code
      accountNo = process.env.MB_BANK_ACCOUNT || "03355778899";
      accountName = process.env.MB_BANK_ACCOUNT_NAME || "NGO VAN NAM";
      phone = process.env.MB_BANK_PHONE || "03355778899";
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


