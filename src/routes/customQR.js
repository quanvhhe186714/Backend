const express = require("express");
const router = express.Router();
const customQRController = require("../controllers/customQRController");
const { protect, isAdmin } = require("../middleware/authMiddleware");

// Tất cả routes đều yêu cầu admin
router.post("/", protect, isAdmin, customQRController.createCustomQR);
router.get("/", protect, isAdmin, customQRController.getAllCustomQRs);
router.get("/:id", protect, customQRController.getCustomQRById);
router.put("/:id", protect, isAdmin, customQRController.updateCustomQR);
router.delete("/:id", protect, isAdmin, customQRController.deleteCustomQR);

module.exports = router;

