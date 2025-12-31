const Wallet = require("../models/wallet");
const Transaction = require("../models/transaction");
const CustomQR = require("../models/customQR");

const ensureWallet = async (userId) => {
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    wallet = await Wallet.create({ user: userId });
  }
  return wallet;
};

const getBankInfo = (bankCode = "mb") => {
  const code = (bankCode || "mb").toLowerCase();

  // MB Bank (mặc định)
  if (code === "mb" || code === "mbbank" || code === "mb bank") {
    return {
      bank: "MB Bank",
      accountName: process.env.MB_BANK_ACCOUNT_NAME || "NGUYEN THANH NHAN",
      accountNumber: process.env.MB_BANK_ACCOUNT || "39397939686879",
      bin: process.env.MB_BANK_BIN || "970422",
      phone: process.env.MB_BANK_PHONE || "",
    };
  }

  // HDBank
  if (
    code === "hd" ||
    code === "hdbank" ||
    code === "hdb" ||
    code === "hd-bank"
  ) {
    return {
      bank: "HDBank",
      accountName:
        process.env.HD_BANK_ACCOUNT_NAME || "LE VAN HA",
      accountNumber:
        process.env.HD_BANK_ACCOUNT || "082704070007936",
      // BIN HDBank for VietQR
      bin: process.env.HD_BANK_BIN || "970437",
      phone: process.env.HD_BANK_PHONE || "",
    };
  }

  // Fallback về MB Bank nếu không khớp (mặc định)
  return {
    bank: "MB Bank",
    accountName: process.env.MB_BANK_ACCOUNT_NAME || "NGUYEN THANH LUAN",
    accountNumber: process.env.MB_BANK_ACCOUNT || "39397939686879",
    bin: process.env.MB_BANK_BIN || "970422",
    phone: process.env.MB_BANK_PHONE || "",
  };
};

const getWalletInfo = async (req, res) => {
  try {
    const wallet = await ensureWallet(req.user._id);
    const recentTransactions = await Transaction.find({
      user: req.user._id,
    })
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({ wallet, recentTransactions });
  } catch (error) {
    res.status(500).json({
      message: "Không thể lấy thông tin ví",
      error: error.message,
    });
  }
};

const initiateTopup = async (req, res) => {
  try {
    const { amount, method = "bank_transfer", bank = "mb", note = "" } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "Số tiền không hợp lệ" });
    }

    const wallet = await ensureWallet(req.user._id);
    // Tạo nội dung chuyển khoản "linh tinh" hơn thay vì TOPUP-...
    const randomWords = [
      "MUAHANG", "NAPTIEN", "THANHTOAN", "DICHVU", "HOC", "PHI", "TRANO", "GOPVON", "DAUTU", "VIPPRO"
    ];
    const pick = randomWords[Math.floor(Math.random() * randomWords.length)];
    const randomNumber = Math.floor(1000 + Math.random() * 9000); // 4 chữ số
    const referenceCode = `${pick}-${randomNumber}`;

    const transaction = await Transaction.create({
      user: req.user._id,
      wallet: wallet._id,
      amount: Number(amount),
      method,
      bank,
      referenceCode,
      note,
      status: "pending",
    });

    const bankInfo = getBankInfo(bank);

    res.status(201).json({
      message: "Tạo yêu cầu nạp tiền thành công",
      transaction,
      instructions: {
        ...bankInfo,
        amount: Number(amount),
        referenceCode,
        transferContent: referenceCode,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Không thể tạo yêu cầu nạp tiền",
      error: error.message,
    });
  }
};

const getUserTransactions = async (req, res) => {
  try {
    // Chỉ lấy transaction chưa bị xóa
    const transactions = await Transaction.find({ user: req.user._id, isDeleted: { $ne: true } }).sort({
      createdAt: -1,
    });
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({
      message: "Không thể lấy lịch sử giao dịch",
      error: error.message,
    });
  }
};

const getAllTransactions = async (_req, res) => {
  try {
    // Mặc định chỉ lấy transaction chưa bị xóa
    const transactions = await Transaction.find({ isDeleted: { $ne: true } })
      .populate("user", "name email")
      .populate("confirmedBy", "name email")
      .sort({ createdAt: -1 });
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({
      message: "Không thể lấy danh sách giao dịch",
      error: error.message,
    });
  }
};

const updateTransactionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!["success", "failed"].includes(status)) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ message: "Không tìm thấy giao dịch" });
    }

    if (transaction.status === "success") {
      return res.status(400).json({ message: "Giao dịch đã được xác nhận trước đó" });
    }

    transaction.status = status;
    transaction.confirmedBy = req.user._id;
    transaction.confirmedAt = new Date();
    await transaction.save();

    if (status === "success") {
      const wallet = await Wallet.findById(transaction.wallet);
      wallet.balance += transaction.amount;
      await wallet.save();
    }

    res.status(200).json({ message: "Cập nhật trạng thái thành công", transaction });
  } catch (error) {
    res.status(500).json({
      message: "Không thể cập nhật trạng thái",
      error: error.message,
    });
  }
};

// 🟢 Ghi nhận thanh toán từ QR code tùy chỉnh
const recordPaymentFromQR = async (req, res) => {
  try {
    const { customQRId, note = "" } = req.body;

    if (!customQRId) {
      return res.status(400).json({ message: "Vui lòng cung cấp ID QR code" });
    }

    // Tìm QR code
    const customQR = await CustomQR.findById(customQRId);
    if (!customQR) {
      return res.status(404).json({ message: "Không tìm thấy QR code" });
    }

    if (!customQR.isActive) {
      return res.status(400).json({ message: "QR code này không còn hoạt động" });
    }

    // Đảm bảo wallet tồn tại
    const wallet = await ensureWallet(req.user._id);

    // Tạo mã tham chiếu duy nhất
    const referenceCode = `QR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Lấy thông tin từ CustomQR
    const amount = customQR.amount || 0;
    const content = customQR.content || customQR.transactionCode || "";
    const accountName = customQR.accountName || "";
    const accountNo = customQR.accountNo || "";
    const bank = customQR.bank || "mb";

    // Tạo transaction mới
    const transaction = await Transaction.create({
      user: req.user._id,
      wallet: wallet._id,
      amount: Number(amount),
      method: "bank_transfer",
      bank: bank,
      referenceCode: referenceCode,
      note: note || content,
      status: "pending",
      customQRId: customQR._id,
    });

    res.status(201).json({
      message: "Ghi nhận thanh toán thành công",
      transaction: {
        ...transaction.toObject(),
        customQR: {
          _id: customQR._id,
          name: customQR.name,
          accountName: accountName,
          accountNo: accountNo,
          bank: bank,
        },
      },
    });
  } catch (error) {
    console.error("Error recording payment from QR:", error);
    res.status(500).json({
      message: "Không thể ghi nhận thanh toán",
      error: error.message,
    });
  }
};

module.exports = {
  getWalletInfo,
  initiateTopup,
  getUserTransactions,
  getAllTransactions,
  updateTransactionStatus,
  recordPaymentFromQR,
};

