const Coupon = require("../models/coupon");

// Check Coupon Validity
const validateCoupon = async (req, res) => {
  try {
    const { code, orderTotal } = req.body;
    const coupon = await Coupon.findOne({ code, isActive: true });

    if (!coupon) {
      return res.status(404).json({ message: "Mã giảm giá không tồn tại hoặc đã hết hạn." });
    }

    if (new Date() > coupon.expirationDate) {
      return res.status(400).json({ message: "Mã giảm giá đã hết hạn." });
    }

    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ message: "Mã giảm giá đã hết lượt sử dụng." });
    }

    if (orderTotal < coupon.minOrderValue) {
      return res.status(400).json({ message: `Đơn hàng tối thiểu ${coupon.minOrderValue}đ để sử dụng mã này.` });
    }

    let discountAmount = 0;
    if (coupon.discountType === "percent") {
      discountAmount = (orderTotal * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
      }
    } else {
      discountAmount = coupon.discountValue;
    }

    res.status(200).json({
      success: true,
      code: coupon.code,
      discountAmount,
      message: "Áp dụng mã giảm giá thành công!"
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi kiểm tra mã giảm giá", error: error.message });
  }
};

// Admin: Create Coupon
const createCoupon = async (req, res) => {
  try {
    const newCoupon = new Coupon(req.body);
    await newCoupon.save();
    res.status(201).json(newCoupon);
  } catch (error) {
    res.status(500).json({ message: "Lỗi tạo mã giảm giá", error: error.message });
  }
};

// Admin: Get All Coupons
const getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.status(200).json(coupons);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy danh sách mã", error: error.message });
  }
};

// Admin: Delete Coupon
const deleteCoupon = async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Đã xóa mã giảm giá" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi xóa mã", error: error.message });
  }
};

module.exports = {
  validateCoupon,
  createCoupon,
  getAllCoupons,
  deleteCoupon
};

