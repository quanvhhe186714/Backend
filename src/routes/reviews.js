const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");
const { protect, isAdmin } = require("../middleware/authMiddleware");

// Public: Get rating summaries (must come before detail routes)
router.get("/product/:productId/summary", reviewController.getProductRatingSummary);
router.get("/service/:serviceId/summary", reviewController.getServiceRatingSummary);

// Public: Get reviews for a product or service
router.get("/product/:productId", reviewController.getProductReviews);
router.get("/service/:serviceId", reviewController.getServiceReviews);

// User routes: Create, update, delete reviews
router.post("/", protect, reviewController.createReview);
router.put("/:reviewId", protect, reviewController.updateReview);
router.delete("/:reviewId", protect, reviewController.deleteReview);

// Admin routes: Manage all reviews
router.get("/", protect, isAdmin, reviewController.getAllReviews);

// Admin routes: Fake reviews (keep for backward compatibility)
router.post("/fake", protect, isAdmin, reviewController.createFakeReview);
router.get("/fake", protect, isAdmin, reviewController.getAllFakeReviews);
router.put("/fake/:reviewId", protect, isAdmin, reviewController.updateFakeReview);
router.delete("/fake/:reviewId", protect, isAdmin, reviewController.deleteFakeReview);

module.exports = router;

