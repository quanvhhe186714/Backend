const express = require("express");
const router = express.Router();
const { validateCoupon, createCoupon, getAllCoupons, deleteCoupon } = require("../controllers/couponController");
const { protect, isAdmin } = require("../middleware/authMiddleware");

router.post("/validate", protect, validateCoupon);
router.get("/", protect, isAdmin, getAllCoupons);
router.post("/", protect, isAdmin, createCoupon);
router.delete("/:id", protect, isAdmin, deleteCoupon);

module.exports = router;

