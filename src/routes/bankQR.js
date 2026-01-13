const express = require("express");
const router = express.Router();
const bankQRController = require("../controllers/bankQRController");
const { protect, isAdmin } = require("../middleware/authMiddleware");

// Public route - lấy danh sách QR code đang hiển thị (không cần auth)
router.get("/public", bankQRController.getVisibleBankQRs);

// Admin routes - yêu cầu admin
router.get("/", protect, isAdmin, bankQRController.getAllBankQRs);
router.put("/:code/visibility", protect, isAdmin, bankQRController.updateBankQRVisibility);

module.exports = router;
