const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getVietQr } = require("../controllers/paymentController");
const {
  getRecentPayments,
  getAllPayments,
} = require("../controllers/paymentHistoryController");

const router = express.Router();

// === VietQR generation ===
router.get("/qr", protect, getVietQr);
// router.get("/qr", protect, getVietQr); // if need auth

// === Payment history (public) ===
router.get("/recent", getRecentPayments);
router.get("/history", getAllPayments);

module.exports = router;


