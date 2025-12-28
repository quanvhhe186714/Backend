const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");
const { protect, isAdmin } = require("../middleware/authMiddleware");

// Public: Get reviews for a product
router.get("/product/:productId", reviewController.getProductReviews);

// Admin routes
router.post("/fake", protect, isAdmin, reviewController.createFakeReview);
router.get("/fake", protect, isAdmin, reviewController.getAllFakeReviews);
router.put("/fake/:reviewId", protect, isAdmin, reviewController.updateFakeReview);
router.delete("/fake/:reviewId", protect, isAdmin, reviewController.deleteFakeReview);

module.exports = router;

