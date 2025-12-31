const router = require("express").Router();
const { getRecentFeeds } = require("../controllers/bankFeedController");

router.get("/", getRecentFeeds);

module.exports = router;

