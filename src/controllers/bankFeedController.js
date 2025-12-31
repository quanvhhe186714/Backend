const BankFeed = require("../models/bankFeed");

exports.getRecentFeeds = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 200);
    const feeds = await BankFeed.find({})
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json(feeds);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi khi lấy bank feeds" });
  }
};

// Lấy toàn bộ lịch sử bank feed với phân trang (mặc định 200 bản ghi mỗi trang)
exports.getAllFeeds = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 200;
    const skip = (page - 1) * limit;

    const [feeds, total] = await Promise.all([
      BankFeed.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit),
      BankFeed.countDocuments({}),
    ]);

    return res.json({
      data: feeds,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi khi lấy danh sách bank feeds" });
  }
};
