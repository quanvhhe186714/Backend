const Review = require("../models/review");
const Product = require("../models/product");
const FacebookService = require("../models/facebookService");
const User = require("../models/users");

// Admin: Create fake review
const createFakeReview = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chỉ admin mới được tạo đánh giá ảo" });
    }

    const { productId, serviceId, userName, userAvatar, rating, comment, createdAt } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "rating (1-5) là bắt buộc" });
    }

    if (!productId && !serviceId) {
      return res.status(400).json({ message: "productId hoặc serviceId là bắt buộc" });
    }

    if (productId && serviceId) {
      return res.status(400).json({ message: "Chỉ được cung cấp productId hoặc serviceId, không được cả hai" });
    }

    // Validate product or service exists
    if (productId) {
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: "Sản phẩm không tồn tại" });
      }
    }

    if (serviceId) {
      const service = await FacebookService.findById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Dịch vụ không tồn tại" });
      }
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

    const reviewData = {
      user: fakeUser._id,
      rating: parseInt(rating),
      comment: comment || "",
      isFake: true,
      createdAt: createdAt ? new Date(createdAt) : new Date(),
      updatedAt: createdAt ? new Date(createdAt) : new Date()
    };

    if (productId) {
      reviewData.product = productId;
    } else {
      reviewData.facebookService = serviceId;
    }

    const review = new Review(reviewData);

    await review.save();
    await review.populate("user", "name email avatar");
    if (productId) {
      await review.populate("product", "name");
    } else {
      await review.populate("facebookService", "name");
    }

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

// User: Create review
const createReview = async (req, res) => {
  try {
    const { productId, serviceId, rating, comment } = req.body;
    const userId = req.user._id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "rating (1-5) là bắt buộc" });
    }

    if (!productId && !serviceId) {
      return res.status(400).json({ message: "productId hoặc serviceId là bắt buộc" });
    }

    if (productId && serviceId) {
      return res.status(400).json({ message: "Chỉ được cung cấp productId hoặc serviceId, không được cả hai" });
    }

    // Validate product or service exists
    if (productId) {
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: "Sản phẩm không tồn tại" });
      }
    }

    if (serviceId) {
      const service = await FacebookService.findById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Dịch vụ không tồn tại" });
      }
    }

    // Check if user already reviewed this product/service
    let existingReview;
    if (productId) {
      existingReview = await Review.findOne({ product: productId, user: userId, isFake: false });
    } else {
      existingReview = await Review.findOne({ facebookService: serviceId, user: userId, isFake: false });
    }

    if (existingReview) {
      return res.status(400).json({ message: "Bạn đã đánh giá sản phẩm/dịch vụ này. Vui lòng cập nhật đánh giá hiện có." });
    }

    const reviewData = {
      user: userId,
      rating: parseInt(rating),
      comment: comment || "",
      isFake: false
    };

    if (productId) {
      reviewData.product = productId;
    } else {
      reviewData.facebookService = serviceId;
    }

    const review = new Review(reviewData);
    await review.save();
    await review.populate("user", "name email avatar");
    if (productId) {
      await review.populate("product", "name");
    } else {
      await review.populate("facebookService", "name");
    }

    res.status(201).json({
      message: "Tạo đánh giá thành công",
      review
    });
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({ 
      message: "Lỗi server khi tạo đánh giá", 
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
      .populate({
        path: "user",
        select: "name email avatar",
        options: { lean: true }
      })
      .populate({
        path: "product",
        select: "name",
        options: { lean: true }
      })
      .sort({ createdAt: -1 })
      .lean();

    // Ensure all reviews are returned even if populate fails
    const reviewsWithDefaults = reviews.map(review => ({
      ...review,
      user: review.user || { name: 'Unknown', email: '', avatar: null },
      product: review.product || { name: 'Unknown' }
    }));

    res.status(200).json(reviewsWithDefaults);
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

    const { productId, serviceId } = req.query;
    let query = { isFake: true };

    if (productId) {
      query.product = productId;
    }
    if (serviceId) {
      query.facebookService = serviceId;
    }

    const fakeReviews = await Review.find(query)
      .populate({
        path: "user",
        select: "name email avatar",
        options: { lean: true }
      })
      .populate({
        path: "product",
        select: "name",
        options: { lean: true }
      })
      .populate({
        path: "facebookService",
        select: "name",
        options: { lean: true }
      })
      .sort({ createdAt: -1 })
      .lean();

    // Ensure all reviews are returned even if populate fails
    const reviewsWithDefaults = fakeReviews.map(review => ({
      ...review,
      user: review.user || { name: 'Unknown', email: '', avatar: null },
      product: review.product || null,
      facebookService: review.facebookService || null
    }));

    res.status(200).json(reviewsWithDefaults);
  } catch (error) {
    console.error("Error getting fake reviews:", error);
    res.status(500).json({ 
      message: "Lỗi server khi lấy đánh giá ảo", 
      error: error.message 
    });
  }
};

// Admin: Get all reviews (both fake and real)
const getAllReviews = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chỉ admin mới được xem tất cả đánh giá" });
    }

    const { productId, serviceId, isFake, page = 1, limit = 1000 } = req.query;
    let query = {};

    if (productId) {
      query.product = productId;
    }
    if (serviceId) {
      query.facebookService = serviceId;
    }
    if (isFake !== undefined) {
      query.isFake = isFake === 'true';
    }

    // Debug logging
    console.log('getAllReviews query:', JSON.stringify(query));
    const totalCount = await Review.countDocuments(query);
    console.log('Total reviews found:', totalCount);

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reviews = await Review.find(query)
      .populate({
        path: "user",
        select: "name email avatar",
        options: { lean: true }
      })
      .populate({
        path: "product",
        select: "name",
        options: { lean: true }
      })
      .populate({
        path: "facebookService",
        select: "name",
        options: { lean: true }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Ensure all reviews are returned even if populate fails
    const reviewsWithDefaults = reviews.map(review => ({
      ...review,
      user: review.user || { name: 'Unknown', email: '', avatar: null },
      product: review.product || null,
      facebookService: review.facebookService || null
    }));

    console.log('Reviews returned:', reviewsWithDefaults.length);

    res.status(200).json({
      reviews: reviewsWithDefaults,
      total: totalCount,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalCount / parseInt(limit))
    });
  } catch (error) {
    console.error("Error getting all reviews:", error);
    res.status(500).json({ 
      message: "Lỗi server khi lấy đánh giá", 
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
    if (review.product) {
      await review.populate("product", "name");
    }
    if (review.facebookService) {
      await review.populate("facebookService", "name");
    }

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

// User/Admin: Update review
const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Không tìm thấy đánh giá" });
    }

    // Check permission: user can only update their own review, admin can update any
    if (!isAdmin && review.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Bạn không có quyền cập nhật đánh giá này" });
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

    review.updatedAt = new Date();
    await review.save();
    await review.populate("user", "name email avatar");
    if (review.product) {
      await review.populate("product", "name");
    }
    if (review.facebookService) {
      await review.populate("facebookService", "name");
    }

    res.status(200).json({
      message: "Cập nhật đánh giá thành công",
      review
    });
  } catch (error) {
    console.error("Error updating review:", error);
    res.status(500).json({ 
      message: "Lỗi server khi cập nhật đánh giá", 
      error: error.message 
    });
  }
};

// User/Admin: Delete review
const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Không tìm thấy đánh giá" });
    }

    // Check permission: user can only delete their own review, admin can delete any
    if (!isAdmin && review.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Bạn không có quyền xóa đánh giá này" });
    }

    await Review.findByIdAndDelete(reviewId);

    res.status(200).json({ 
      message: "Đã xóa đánh giá thành công",
      deletedReviewId: reviewId
    });
  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(500).json({ 
      message: "Lỗi server khi xóa đánh giá", 
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

// Get reviews for a Facebook service (including fake ones)
const getServiceReviews = async (req, res) => {
  try {
    const { serviceId } = req.params;

    if (!serviceId) {
      return res.status(400).json({ message: "serviceId là bắt buộc" });
    }

    const reviews = await Review.find({ facebookService: serviceId })
      .populate({
        path: "user",
        select: "name email avatar",
        options: { lean: true }
      })
      .populate({
        path: "facebookService",
        select: "name",
        options: { lean: true }
      })
      .sort({ createdAt: -1 })
      .lean();

    // Ensure all reviews are returned even if populate fails
    const reviewsWithDefaults = reviews.map(review => ({
      ...review,
      user: review.user || { name: 'Unknown', email: '', avatar: null },
      facebookService: review.facebookService || { name: 'Unknown' }
    }));

    res.status(200).json(reviewsWithDefaults);
  } catch (error) {
    console.error("Error getting service reviews:", error);
    res.status(500).json({ 
      message: "Lỗi server khi lấy đánh giá", 
      error: error.message 
    });
  }
};

// Get rating summary for a product
const getProductRatingSummary = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ message: "productId là bắt buộc" });
    }

    // Get product to check for totalReviewers
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Sản phẩm không tồn tại" });
    }

    const reviews = await Review.find({ product: productId });
    console.log(`getProductRatingSummary - productId: ${productId}, found ${reviews.length} reviews`);
    const totalReviews = reviews.length;
    
    if (totalReviews === 0) {
      return res.status(200).json({
        averageRating: 0,
        totalReviews: 0,
        totalUsers: product.totalReviewers || 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      });
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = (totalRating / totalReviews).toFixed(1);
    
    // Use totalReviewers from product if set, otherwise calculate from reviews
    let totalUsers;
    if (product.totalReviewers !== null && product.totalReviewers !== undefined) {
      totalUsers = product.totalReviewers;
    } else {
      // Count unique users who reviewed
      const uniqueUsers = new Set();
      reviews.forEach(review => {
        if (review.user) {
          uniqueUsers.add(review.user.toString());
        }
      });
      totalUsers = uniqueUsers.size;
    }
    
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(review => {
      ratingDistribution[review.rating]++;
    });

    res.status(200).json({
      averageRating: parseFloat(averageRating),
      totalReviews,
      totalUsers,
      ratingDistribution
    });
  } catch (error) {
    console.error("Error getting product rating summary:", error);
    res.status(500).json({ 
      message: "Lỗi server khi lấy tổng hợp đánh giá", 
      error: error.message 
    });
  }
};

// Get rating summary for a Facebook service
const getServiceRatingSummary = async (req, res) => {
  try {
    const { serviceId } = req.params;

    if (!serviceId) {
      return res.status(400).json({ message: "serviceId là bắt buộc" });
    }

    // Get service to check for totalReviewers
    const service = await FacebookService.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: "Dịch vụ không tồn tại" });
    }

    const reviews = await Review.find({ facebookService: serviceId });
    console.log(`getServiceRatingSummary - serviceId: ${serviceId}, found ${reviews.length} reviews`);
    const totalReviews = reviews.length;
    
    if (totalReviews === 0) {
      return res.status(200).json({
        averageRating: 0,
        totalReviews: 0,
        totalUsers: service.totalReviewers || 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      });
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = (totalRating / totalReviews).toFixed(1);
    
    // Use totalReviewers from service if set, otherwise calculate from reviews
    let totalUsers;
    if (service.totalReviewers !== null && service.totalReviewers !== undefined) {
      totalUsers = service.totalReviewers;
    } else {
      // Count unique users who reviewed
      const uniqueUsers = new Set();
      reviews.forEach(review => {
        if (review.user) {
          uniqueUsers.add(review.user.toString());
        }
      });
      totalUsers = uniqueUsers.size;
    }
    
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(review => {
      ratingDistribution[review.rating]++;
    });

    res.status(200).json({
      averageRating: parseFloat(averageRating),
      totalReviews,
      totalUsers,
      ratingDistribution
    });
  } catch (error) {
    console.error("Error getting service rating summary:", error);
    res.status(500).json({ 
      message: "Lỗi server khi lấy tổng hợp đánh giá", 
      error: error.message 
    });
  }
};

module.exports = {
  createFakeReview,
  createReview,
  getProductReviews,
  getServiceReviews,
  getProductRatingSummary,
  getServiceRatingSummary,
  getAllFakeReviews,
  getAllReviews,
  updateFakeReview,
  updateReview,
  deleteFakeReview,
  deleteReview
};

