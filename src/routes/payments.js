const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getVietQr } = require("../controllers/paymentController");
const { receiveWebhook, getAccountInfo, testWebhook, manualCheckTransactions } = require("../controllers/sepayController");

const router = express.Router();

// Public route for QR code generation (for payment/deposit page)
// Can be used without authentication for convenience
router.get("/qr", getVietQr);

// SePay routes
router.post("/sepay/webhook", receiveWebhook); // Webhook endpoint (SePay sẽ gọi đến đây)
router.get("/sepay/account-info", getAccountInfo); // Lấy thông tin tài khoản SePay
router.post("/sepay/test-webhook", testWebhook); // Test webhook (dùng để test local)
router.post("/sepay/check-pending", protect, manualCheckTransactions); // Kiểm tra thủ công các transaction pending (cần auth)

// Protected route (if needed for authenticated users only)
// router.get("/qr", protect, getVietQr);

module.exports = router;


