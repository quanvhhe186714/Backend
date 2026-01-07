const express = require("express");
const router = express.Router();
const { createOrder, getMyOrders, getAllOrders, updateOrderStatus, getDashboardStats, regenerateInvoice, regenerateAllInvoices, updateOrderTimestamp, downloadInvoice, assignCustomQRToOrder, getPendingOrdersByUser } = require("../controllers/orderController");
const userController = require("../controllers/userController");
const { protect, isAdmin } = require("../middleware/authMiddleware");

router.post("/", protect, createOrder);
router.get("/my-orders", protect, getMyOrders);
router.get("/", protect, isAdmin, getAllOrders);
router.get("/by-user/:userId/pending", protect, isAdmin, getPendingOrdersByUser);
router.put("/:id/status", protect, isAdmin, updateOrderStatus);
router.put("/:id/timestamp", protect, isAdmin, updateOrderTimestamp);
router.put("/:id/assign-qr", protect, isAdmin, assignCustomQRToOrder);
router.get("/stats", protect, isAdmin, getDashboardStats);
router.post("/:id/regenerate-invoice", protect, isAdmin, regenerateInvoice);
router.post("/regenerate-all-invoices", protect, isAdmin, regenerateAllInvoices);
router.get("/:id/download-invoice", protect, downloadInvoice);

// Admin: Soft delete và restore order
router.delete("/:id/soft-delete", protect, isAdmin, userController.softDeleteOrder);
router.post("/:id/restore", protect, isAdmin, userController.restoreOrder);

module.exports = router;
