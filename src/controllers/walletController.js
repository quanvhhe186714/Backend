const Wallet = require("../models/wallet");
const Transaction = require("../models/transaction");
const CustomQR = require("../models/customQR");
const { getContentFromAnyData } = require("../utils/getContentFromData");

const ensureWallet = async (userId) => {
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    wallet = await Wallet.create({ user: userId });
  }
  return wallet;
};

const getBankInfo = (bankCode = "vietin") => {
  const code = (bankCode || "vietin").toLowerCase();

  // VietinBank – Ưu tiên
  if (code === "vietin" || code === "vietinbank" || code === "vtb") {
    return {
      bank: "VietinBank",
      accountName: process.env.VIETIN_BANK_ACCOUNT_NAME || "VU HONG QUAN",
      accountNumber: process.env.VIETIN_BANK_ACCOUNT || "107876717017",
      bin: process.env.VIETIN_BANK_BIN || "970415",
      phone: process.env.VIETIN_BANK_PHONE || "",
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
      accountName: process.env.HD_BANK_ACCOUNT_NAME || "LE VAN HA",
      accountNumber: process.env.HD_BANK_ACCOUNT || "082704070007936",
      bin: process.env.HD_BANK_BIN || "970437",
      phone: process.env.HD_BANK_PHONE || "",
    };
  }

  // Fallback về VietinBank nếu không khớp
  return {
    bank: "VietinBank",
    accountName: process.env.VIETIN_BANK_ACCOUNT_NAME || "VU HONG QUAN",
    accountNumber: process.env.VIETIN_BANK_ACCOUNT || "107876717017",
    bin: process.env.VIETIN_BANK_BIN || "970415",
    phone: process.env.VIETIN_BANK_PHONE || "",
  };
};

const getWalletInfo = async (req, res) => {
  try {
    const wallet = await ensureWallet(req.user._id);
    const recentTransactions = await Transaction.find({
      user: req.user._id,
      isDeleted: { $ne: true },
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
    const { amount, method = "bank_transfer", bank = "vietin", note = "" } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "Số tiền không hợp lệ" });
    }

    const wallet = await ensureWallet(req.user._id);
    // Tìm nội dung trong file JSON (in/out)
    let referenceCode = getContentFromAnyData(Number(amount));

    // Đảm bảo referenceCode là duy nhất trong collection Transaction
    if (referenceCode) {
      const exists = await Transaction.findOne({ referenceCode });
      if (exists) {
        // Nếu trùng, thêm hậu tố thời gian để khác biệt
        referenceCode = `${referenceCode}-${Date.now().toString().slice(-4)}`;
      }
    }

    if (!referenceCode) {
      // Nếu không có, sinh ngẫu nhiên như cũ
      const randomWords = [
        "MUAHANG",
        "NAPTIEN",
        "THANHTOAN",
        "DICHVU",
        "HOC",
        "PHI",
        "TRANO",
        "GOPVON",
        "DAUTU",
        "VIPPRO",
      ];
      const pick = randomWords[Math.floor(Math.random() * randomWords.length)];
      const randomNumber = Math.floor(1000 + Math.random() * 9000);
      referenceCode = `${pick}-${randomNumber}`;
    }

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

// 🟢 Lấy lịch sử giao dịch của user (customer tự xem)
const getUserTransactions = async (req, res) => {
  try {
    // Chỉ lấy transaction chưa bị xóa
    const transactions = await Transaction.find({ user: req.user._id, isDeleted: { $ne: true } })
      .sort({ createdAt: -1 });
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({
      message: "Không thể lấy lịch sử giao dịch",
      error: error.message,
    });
  }
};

// 🟢 Admin: lấy toàn bộ transactions
const getAllTransactions = async (_req, res) => {
  try {
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

// 🟢 Admin: cập nhật trạng thái giao dịch
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

    const customQR = await CustomQR.findById(customQRId);
    if (!customQR) {
      return res.status(404).json({ message: "Không tìm thấy QR code" });
    }

    if (!customQR.isActive) {
      return res.status(400).json({ message: "QR code này không còn hoạt động" });
    }

    const wallet = await ensureWallet(req.user._id);

    const referenceCode = `QR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const amount = customQR.amount || 0;

    let content = customQR.content || customQR.transactionCode || "";
    if (amount > 0) {
      const contentFromData = getContentFromAnyData(Number(amount));
      if (contentFromData) {
        content = contentFromData;
      }
    }

    const accountName = customQR.accountName || "";
    const accountNo = customQR.accountNo || "";
    const bank = customQR.bank || "vietin";

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
