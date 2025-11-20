const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getVietQr } = require("../controllers/paymentController");

const router = express.Router();

// Public route for QR code generation (for payment/deposit page)
// Can be used without authentication for convenience
router.get("/qr", getVietQr);

// Protected route (if needed for authenticated users only)
// router.get("/qr", protect, getVietQr);

module.exports = router;


