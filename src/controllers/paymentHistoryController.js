const PaymentHistoryFull = require("../models/paymentHistoryFull");

const normalizeTx = (doc) => {
  const createdAt = doc.createdAt ? new Date(doc.createdAt) : null;

  return {
    _id: doc._id,
    createdAt,
    amount:
      typeof doc.amount === "number"
        ? doc.amount
        : doc.amount
          ? Number(doc.amount)
          : Number(doc.so_tien || 0),
    status: doc.status || "success",
    note: doc.note || doc.noi_dung || "",
    referenceCode: doc.referenceCode || "",
    customQRId: doc.customQRId || null,
    method: doc.paymentMethod || doc.method || "bank_transfer",
    bank: doc.bank || "",
    currency: doc.currency || "VND",
    paymentType: doc.paymentType || "",
    account: doc.account?.number ? doc.account : (doc.stk ? { number: doc.stk } : null),
  };
};

// Get recent payments (default limit 10)
exports.getRecentPayments = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;

    const docs = await PaymentHistoryFull.find({})
      .sort({ createdAt: -1 })
      .limit(limit);

    return res.json(docs.map(normalizeTx));
  } catch (error) {
    console.error("Error getRecentPayments:", error);
    return res.status(500).json({
      message: "Không thể lấy lịch sử giao dịch gần đây",
      error: error.message,
    });
  }
};

// Get full payment history with pagination
exports.getAllPayments = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      PaymentHistoryFull.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PaymentHistoryFull.countDocuments({}),
    ]);

    return res.json({
      data: docs.map(normalizeTx),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error getAllPayments:", error);
    return res.status(500).json({
      message: "Không thể lấy danh sách lịch sử thanh toán",
      error: error.message,
    });
  }
};

