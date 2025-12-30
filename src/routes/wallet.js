const express = require("express");
const router = express.Router();
const { protect, isAdmin } = require("../middleware/authMiddleware");
const {
  getWalletInfo,
  initiateTopup,
  getUserTransactions,
  getAllTransactions,
  updateTransactionStatus,
  recordPaymentFromQR,
  getTransactionStatus,
} = require("../controllers/walletController");
const userController = require("../controllers/userController");

// User routes
router.get("/", protect, getWalletInfo);
router.post("/topup", protect, initiateTopup);
router.get("/transactions", protect, getUserTransactions);
router.get("/transactions/status/:identifier", protect, getTransactionStatus); // Check transaction status by referenceCode or ID
router.post("/record-payment", protect, recordPaymentFromQR);

// Admin routes
router.get("/admin/transactions", protect, isAdmin, getAllTransactions);
router.patch("/admin/transactions/:id", protect, isAdmin, updateTransactionStatus);

// Admin: Soft delete và restore transaction
router.delete("/admin/transactions/:id/soft-delete", protect, isAdmin, userController.softDeleteTransaction);
router.post("/admin/transactions/:id/restore", protect, isAdmin, userController.restoreTransaction);

module.exports = router;

