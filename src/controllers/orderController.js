const Order = require("../models/order");
const Product = require("../models/product");
const Coupon = require("../models/coupon");

// Customer: Create Order
const createOrder = async (req, res) => {
  try {
    const { items, paymentMethod, couponCode } = req.body; // items: [{ productId, quantity }]
    let subTotal = 0;
    const orderItems = [];

    // 1. Calculate Subtotal
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return res.status(404).json({ message: `Product ${item.productId} not found` });
      
      subTotal += product.price * item.quantity;
      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        durationMonths: product.duration_months
      });
    }

    // 2. Apply Coupon if exists
    let discountAmount = 0;
    let appliedCoupon = null;

    if (couponCode) {
        const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
        if (coupon) {
            // Basic Validation
            if (new Date() > coupon.expirationDate) {
                return res.status(400).json({ message: "Coupon expired" });
            }
            if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
                return res.status(400).json({ message: "Coupon usage limit reached" });
            }
            if (subTotal < coupon.minOrderValue) {
                return res.status(400).json({ message: `Order must be at least ${coupon.minOrderValue} to use this coupon` });
            }

            // Calculate Discount
            if (coupon.discountType === "percent") {
                discountAmount = (subTotal * coupon.discountValue) / 100;
                if (coupon.maxDiscountAmount) {
                    discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
                }
            } else {
                discountAmount = coupon.discountValue;
            }
            appliedCoupon = coupon;
        } else {
             return res.status(404).json({ message: "Invalid Coupon Code" });
        }
    }

    const totalAmount = Math.max(0, subTotal - discountAmount);

    // 3. Create Order
    const newOrder = new Order({
      user: req.user.id,
      items: orderItems,
      subTotal,
      discountAmount,
      totalAmount,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      paymentMethod,
      paymentDetails: req.body.paymentDetails || {},
      status: "pending"
    });

    const savedOrder = await newOrder.save();

    // 4. Update Coupon Usage
    if (appliedCoupon) {
        appliedCoupon.usedCount += 1;
        await appliedCoupon.save();
    }

    res.status(201).json(savedOrder);
  } catch (error) {
    res.status(500).json({ message: "Error creating order", error: error.message });
  }
};

// Customer: Get My Orders
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: "Error fetching orders", error: error.message });
  }
};

// Admin: Get All Orders
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate("user", "name email").sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: "Error fetching all orders", error: error.message });
  }
};

// Admin: Update Order Status
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: "Error updating order", error: error.message });
  }
};

// Admin: Get Dashboard Stats
const getDashboardStats = async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const totalProducts = await Product.countDocuments();
        const totalUsers = await require("../models/users").countDocuments();
        
        // Calculate Revenue (only paid/completed orders)
        const revenueResult = await Order.aggregate([
            { $match: { status: { $in: ["paid", "completed"] } } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]);
        const totalRevenue = revenueResult.length ? revenueResult[0].total : 0;

        res.status(200).json({
            totalOrders,
            totalProducts,
            totalUsers,
            totalRevenue
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching stats", error: error.message });
    }
}

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  getDashboardStats
};
