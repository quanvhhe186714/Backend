const router = require("express").Router();
const { getRecentFeeds, getAllFeeds } = require("../controllers/bankFeedController");

// /public/transactions  => recent limited list
router.get("/", getRecentFeeds);
// /public/transactions/history => full list with pagination
router.get("/history", getAllFeeds);

module.exports = router;
