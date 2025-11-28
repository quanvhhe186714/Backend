const express = require("express");
const router = express.Router();
const { createOrder, getMyOrders, getAllOrders, updateOrderStatus, getDashboardStats, regenerateInvoice, regenerateAllInvoices } = require("../controllers/orderController");
const { protect, isAdmin } = require("../middleware/authMiddleware");

router.post("/", protect, createOrder);
router.get("/my-orders", protect, getMyOrders);
router.get("/", protect, isAdmin, getAllOrders);
router.put("/:id/status", protect, isAdmin, updateOrderStatus);
router.get("/stats", protect, isAdmin, getDashboardStats);
router.post("/:id/regenerate-invoice", protect, isAdmin, regenerateInvoice);
router.post("/regenerate-all-invoices", protect, isAdmin, regenerateAllInvoices);

module.exports = router;
