const express = require("express");
const router = express.Router();
const { protect, isAdmin } = require("../middleware/authMiddleware");
const {
  getWalletInfo,
  initiateTopup,
  getUserTransactions,
  getAllTransactions,
  updateTransactionStatus,
} = require("../controllers/walletController");

// User routes
router.get("/", protect, getWalletInfo);
router.post("/topup", protect, initiateTopup);
router.get("/transactions", protect, getUserTransactions);

// Admin routes
router.get("/admin/transactions", protect, isAdmin, getAllTransactions);
router.patch("/admin/transactions/:id", protect, isAdmin, updateTransactionStatus);

module.exports = router;

