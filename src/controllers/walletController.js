const Wallet = require("../models/wallet");
const Transaction = require("../models/transaction");

const ensureWallet = async (userId) => {
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    wallet = await Wallet.create({ user: userId });
  }
  return wallet;
};

const getBankInfo = (bankCode = "mb") => {
  if (bankCode === "cake") {
    return {
      bank: "CAKE",
      accountName: process.env.CAKE_BANK_ACCOUNT_NAME || "NGO VAN NAM",
      accountNumber: process.env.CAKE_BANK_ACCOUNT || "0334443570",
      bin: process.env.CAKE_BANK_BIN || "970422",
    };
  }
  return {
    bank: "MB Bank",
    accountName: process.env.MB_BANK_ACCOUNT_NAME || "NGO VAN NAM",
    accountNumber: process.env.MB_BANK_ACCOUNT || "03355778899",
    bin: process.env.MB_BANK_BIN || "970422",
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
    const referenceCode = `TOPUP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

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
    const transactions = await Transaction.find({ user: req.user._id }).sort({
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
    const transactions = await Transaction.find({})
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

module.exports = {
  getWalletInfo,
  initiateTopup,
  getUserTransactions,
  getAllTransactions,
  updateTransactionStatus,
};

