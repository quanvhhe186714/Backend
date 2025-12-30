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

  // MB Bank (mặc định) - SePay Account
  if (code === "mb" || code === "mbbank" || code === "mb bank") {
    return {
      bank: "MB Bank",
      accountName: process.env.MB_BANK_ACCOUNT_NAME || process.env.SEPAY_ACCOUNT_NAME || "TRAN DANG LINH",
      accountNumber: process.env.MB_BANK_ACCOUNT || process.env.SEPAY_ACCOUNT_NO || "77891011121314",
      bin: process.env.MB_BANK_BIN || "970422",
      phone: process.env.MB_BANK_PHONE || "",
    };
  }

  // VietinBank
  if (
    code === "vietin" ||
    code === "vietinbank" ||
    code === "vtb" ||
    code === "vietin-bank"
  ) {
    return {
      bank: "VietinBank",
      accountName:
        process.env.VIETIN_BANK_ACCOUNT_NAME || "VU HONG QUAN",
      accountNumber:
        process.env.VIETIN_BANK_ACCOUNT || "107876717017",
      // BIN VietinBank chuẩn cho VietQR
      bin: process.env.VIETIN_BANK_BIN || "970415",
      phone: process.env.VIETIN_BANK_PHONE || "",
    };
  }

  // Fallback về MB Bank nếu không khớp - SePay Account
  return {
    bank: "MB Bank",
    accountName: process.env.MB_BANK_ACCOUNT_NAME || process.env.SEPAY_ACCOUNT_NAME || "TRAN DANG LINH",
    accountNumber: process.env.MB_BANK_ACCOUNT || process.env.SEPAY_ACCOUNT_NO || "77891011121314",
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

    const finalAmount = Number(amount);
    
    // Log để debug
    console.log("💰 Creating topup transaction:", {
      userId: req.user._id,
      amount: finalAmount,
      method,
      bank,
    });

    const wallet = await ensureWallet(req.user._id);
    const referenceCode = `TOPUP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    console.log("📝 Creating transaction with referenceCode:", referenceCode);

    const transaction = await Transaction.create({
      user: req.user._id,
      wallet: wallet._id,
      amount: finalAmount,
      method,
      bank,
      referenceCode,
      note,
      status: "pending",
    });

    console.log("✅ Transaction created successfully:", {
      transactionId: transaction._id,
      referenceCode: transaction.referenceCode,
      amount: transaction.amount,
      status: transaction.status,
      createdAt: transaction.createdAt,
      userId: transaction.user,
      walletId: transaction.wallet,
    });
    
    // Verify transaction exists in database
    const verifyTransaction = await Transaction.findById(transaction._id);
    if (!verifyTransaction) {
      console.error("❌ CRITICAL: Transaction was not saved to database!");
      throw new Error("Transaction creation failed - not found in database");
    } else {
      console.log("✅ Verified: Transaction exists in database");
    }

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

/**
 * Lấy trạng thái transaction theo referenceCode hoặc transaction ID
 * GET /wallet/transactions/status/:identifier
 */
const getTransactionStatus = async (req, res) => {
  try {
    const { identifier } = req.params; // Có thể là referenceCode hoặc transaction ID

    // Tìm transaction theo referenceCode hoặc _id
    const transaction = await Transaction.findOne({
      $or: [
        { referenceCode: identifier },
        { _id: identifier },
      ],
      user: req.user._id, // Chỉ lấy transaction của user hiện tại
      isDeleted: { $ne: true },
    }).populate("wallet");

    if (!transaction) {
      return res.status(404).json({
        message: "Không tìm thấy giao dịch",
      });
    }

    // Lấy wallet balance mới nhất
    const wallet = await Wallet.findById(transaction.wallet._id || transaction.wallet);

    res.status(200).json({
      success: true,
      transaction,
      wallet: wallet ? {
        balance: wallet.balance,
        _id: wallet._id,
      } : null,
    });
  } catch (error) {
    res.status(500).json({
      message: "Không thể lấy trạng thái giao dịch",
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
  getTransactionStatus,
};

