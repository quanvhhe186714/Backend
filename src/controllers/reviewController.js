const Review = require("../models/review");
const Product = require("../models/product");
const User = require("../models/users");

// Admin: Create fake review
const createFakeReview = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chỉ admin mới được tạo đánh giá ảo" });
    }

    const { productId, userName, userAvatar, rating, comment, createdAt } = req.body;

    if (!productId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "productId và rating (1-5) là bắt buộc" });
    }

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Sản phẩm không tồn tại" });
    }

    // Find or create fake user
    let fakeUser = null;
    if (userName) {
      fakeUser = await User.findOne({ name: userName, role: { $ne: 'admin' } });
      if (!fakeUser) {
        // Create a fake user
        fakeUser = new User({
          name: userName,
          email: `fake_review_${Date.now()}@fake.com`,
          password: 'fake', // Won't be used
          role: 'customer',
          avatar: userAvatar || null
        });
        await fakeUser.save();
      }
    } else {
      return res.status(400).json({ message: "userName là bắt buộc" });
    }

    const review = new Review({
      product: productId,
      user: fakeUser._id,
      rating: parseInt(rating),
      comment: comment || "",
      isFake: true,
      createdAt: createdAt ? new Date(createdAt) : new Date(),
      updatedAt: createdAt ? new Date(createdAt) : new Date()
    });

    await review.save();
    await review.populate("user", "name email avatar");
    await review.populate("product", "name");

    res.status(201).json({
      message: "Tạo đánh giá ảo thành công",
      review
    });
  } catch (error) {
    console.error("Error creating fake review:", error);
    res.status(500).json({ 
      message: "Lỗi server khi tạo đánh giá ảo", 
      error: error.message 
    });
  }
};

// Get reviews for a product (including fake ones)
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ message: "productId là bắt buộc" });
    }

    const reviews = await Review.find({ product: productId })
      .populate("user", "name email avatar")
      .populate("product", "name")
      .sort({ createdAt: -1 });

    res.status(200).json(reviews);
  } catch (error) {
    console.error("Error getting product reviews:", error);
    res.status(500).json({ 
      message: "Lỗi server khi lấy đánh giá", 
      error: error.message 
    });
  }
};

// Admin: Get all fake reviews
const getAllFakeReviews = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chỉ admin mới được xem đánh giá ảo" });
    }

    const { productId } = req.query;
    let query = { isFake: true };

    if (productId) {
      query.product = productId;
    }

    const fakeReviews = await Review.find(query)
      .populate("user", "name email avatar")
      .populate("product", "name")
      .sort({ createdAt: -1 });

    res.status(200).json(fakeReviews);
  } catch (error) {
    console.error("Error getting fake reviews:", error);
    res.status(500).json({ 
      message: "Lỗi server khi lấy đánh giá ảo", 
      error: error.message 
    });
  }
};

// Admin: Update fake review
const updateFakeReview = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chỉ admin mới được cập nhật đánh giá ảo" });
    }

    const { reviewId } = req.params;
    const { rating, comment, createdAt } = req.body;

    const review = await Review.findOne({ _id: reviewId, isFake: true });
    if (!review) {
      return res.status(404).json({ message: "Không tìm thấy đánh giá ảo" });
    }

    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating phải từ 1 đến 5" });
      }
      review.rating = parseInt(rating);
    }

    if (comment !== undefined) {
      review.comment = comment;
    }

    if (createdAt) {
      review.createdAt = new Date(createdAt);
      review.updatedAt = new Date(createdAt);
    } else {
      review.updatedAt = new Date();
    }

    await review.save();
    await review.populate("user", "name email avatar");
    await review.populate("product", "name");

    res.status(200).json({
      message: "Cập nhật đánh giá ảo thành công",
      review
    });
  } catch (error) {
    console.error("Error updating fake review:", error);
    res.status(500).json({ 
      message: "Lỗi server khi cập nhật đánh giá ảo", 
      error: error.message 
    });
  }
};

// Admin: Delete fake review
const deleteFakeReview = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chỉ admin mới được xóa đánh giá ảo" });
    }

    const { reviewId } = req.params;

    const review = await Review.findOne({ _id: reviewId, isFake: true });
    if (!review) {
      return res.status(404).json({ message: "Không tìm thấy đánh giá ảo" });
    }

    await Review.findByIdAndDelete(reviewId);

    res.status(200).json({ 
      message: "Đã xóa đánh giá ảo thành công",
      deletedReviewId: reviewId
    });
  } catch (error) {
    console.error("Error deleting fake review:", error);
    res.status(500).json({ 
      message: "Lỗi server khi xóa đánh giá ảo", 
      error: error.message 
    });
  }
};

module.exports = {
  createFakeReview,
  getProductReviews,
  getAllFakeReviews,
  updateFakeReview,
  deleteFakeReview
};

