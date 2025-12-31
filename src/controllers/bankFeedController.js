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

