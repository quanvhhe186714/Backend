const express = require("express");
const router = express.Router();
const {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  calculatePrice
} = require("../controllers/facebookServiceController");
const { protect, admin } = require("../../../middleware/authMiddleware");

// Public routes
router.get("/", getAllServices);
router.get("/:id", getServiceById);
router.post("/calculate", calculatePrice);

// Admin routes
router.post("/", protect, admin, createService);
router.put("/:id", protect, admin, updateService);
router.delete("/:id", protect, admin, deleteService);

module.exports = router;

