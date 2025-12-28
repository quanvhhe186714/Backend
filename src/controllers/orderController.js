const Order = require("../models/order");
const Product = require("../models/product");
const Coupon = require("../models/coupon");
const Wallet = require("../models/wallet");
const Message = require("../models/message");
const User = require("../models/users");
const { generateInvoicePDF } = require("../utils/invoice.util");
const FacebookService = require("../services/facebook/models/facebookService");

// Customer: Create Order
const createOrder = async (req, res) => {
  try {
    const { items, paymentMethod, couponCode } = req.body; // items: [{ productId, quantity, type? }]
    let subTotal = 0;
    const orderItems = [];

    // 1. Calculate Subtotal
    for (const item of items) {
      if (item.type === "service") {
        // Xử lý dịch vụ
        // Giá đã được tính sẵn từ frontend (item.price)
        subTotal += item.price * item.quantity; // quantity thường là 1 cho dịch vụ
        
        orderItems.push({
          serviceId: item.serviceId,
          type: "service",
          name: item.name || item.serviceName,
          price: item.price,
          quantity: item.quantity,
          serviceQuantity: item.serviceQuantity,
          serviceUnit: item.serviceUnit,
          serviceUnitLabel: item.serviceUnitLabel,
          serviceUrls: item.urls || item.serviceUrls,
          serviceServer: item.server || item.serviceServer,
          serviceEmotion: item.emotion || item.serviceEmotion,
          serviceType: item.serviceType || "facebook_service"
        });
      } else {
        // Xử lý sản phẩm (mặc định)
        const product = await Product.findById(item.productId);
        if (!product) return res.status(404).json({ message: `Product ${item.productId} not found` });
        
        subTotal += product.price * item.quantity;
        orderItems.push({
          product: product._id,
          type: "product",
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          durationMonths: product.duration_months
        });
      }
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

    // 3. Ensure wallet balance is sufficient and deduct immediately
    const wallet = await Wallet.findOne({ user: req.user.id });
    if (!wallet) {
      return res.status(400).json({ message: "Không tìm thấy ví của người dùng" });
    }

    if (wallet.balance < totalAmount) {
      return res.status(400).json({
        message: "Số dư ví không đủ. Vui lòng nạp thêm tiền trước khi đặt hàng.",
      });
    }

    wallet.balance -= totalAmount;
    await wallet.save();

    // 4. Create Order
    const newOrder = new Order({
      user: req.user.id,
      items: orderItems,
      subTotal,
      discountAmount,
      totalAmount,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      paymentMethod,
      paymentDetails: req.body.paymentDetails || {},
      status: "pending",
      walletCharged: true
    });

    const savedOrder = await newOrder.save();

    // 5. Update Coupon Usage
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
    // Chỉ lấy đơn hàng chưa bị xóa (sử dụng $ne: true để match cả document cũ không có trường isDeleted)
    const orders = await Order.find({ user: req.user.id, isDeleted: { $ne: true } })
      .populate('customQRCode')
      .sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: "Error fetching orders", error: error.message });
  }
};

// Admin: Get All Orders
const getAllOrders = async (req, res) => {
  try {
    // Mặc định chỉ lấy đơn hàng chưa bị xóa
    const query = { isDeleted: { $ne: true } };
    const orders = await Order.find(query)
      .populate("user", "name email")
      .populate('customQRCode')
      .sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: "Error fetching all orders", error: error.message });
  }
};

// Admin: Update Order Status
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ["pending", "paid", "failed", "completed", "cancelled", "delivered"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status provided" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const shouldChargeWallet = ["paid", "completed", "delivered"].includes(status);
    const shouldRefundWallet = ["failed", "cancelled"].includes(status);

    if (shouldChargeWallet && !order.walletCharged) {
      const wallet = await Wallet.findOne({ user: order.user });
      if (!wallet) {
        return res.status(400).json({ message: "Wallet not found for this user" });
      }
      if (wallet.balance < order.totalAmount) {
        return res
          .status(400)
          .json({ message: "Số dư ví không đủ để thanh toán đơn hàng này" });
      }
      wallet.balance -= order.totalAmount;
      await wallet.save();
      order.walletCharged = true;
    }

    if (shouldRefundWallet && order.walletCharged) {
      const wallet = await Wallet.findOne({ user: order.user });
      if (wallet) {
        wallet.balance += order.totalAmount;
        await wallet.save();
      }
      order.walletCharged = false;
    }

    order.status = status;
    // Save status
    await order.save();

    // Generate invoice automatically when order becomes paid or delivered
    if (["paid", "delivered"].includes(order.status) && !order.invoicePath) {
      try {
        const invoiceUrl = await generateInvoicePDF(order._id);
        order.invoicePath = invoiceUrl;
        await order.save();
      } catch (e) {
        // Do not fail the request if invoice generation fails
        console.error("Invoice generation error:", e?.message || e);
      }
    }

    // Auto-create fake message when order becomes successful (paid/completed/delivered)
    // This helps demonstrate app activity and build user trust
    if (["paid", "completed", "delivered"].includes(order.status)) {
      try {
        // Check if fake message already exists for this order
        const existingFakeMessage = await Message.findOne({
          orderId: order._id,
          isFake: true
        });

        if (!existingFakeMessage) {
          // Get user info
          const user = await User.findById(order.user);
          if (user) {
            const conversationId = `admin_${user._id}`;
            
            // Create a positive fake message from the customer
            const fakeMessage = new Message({
              sender: user._id,
              receiver: null,
              content: `Cảm ơn shop! Đơn hàng #${order._id.toString().substring(0, 8)} đã được xử lý nhanh chóng. Sản phẩm/dịch vụ chất lượng tốt! 👍`,
              isFromAdmin: false,
              isFake: true,
              conversationId: conversationId,
              orderId: order._id,
              createdAt: new Date(),
              updatedAt: new Date()
            });

            await fakeMessage.save();
            console.log(`✅ Tự động tạo tin nhắn ảo cho đơn hàng ${order._id}`);
          }
        }
      } catch (e) {
        // Do not fail the request if fake message creation fails
        console.error("Auto fake message creation error:", e?.message || e);
      }
    }

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

// Admin: Regenerate Invoice (tạo lại invoice cho đơn hàng)
const regenerateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Chỉ tạo invoice cho đơn hàng đã thanh toán
    if (!["paid", "completed", "delivered"].includes(order.status)) {
      return res.status(400).json({ 
        message: "Chỉ có thể tạo invoice cho đơn hàng đã thanh toán" 
      });
    }

    // Tạo lại invoice
    try {
      const invoiceUrl = await generateInvoicePDF(order._id);
      order.invoicePath = invoiceUrl;
      await order.save();
      
      res.status(200).json({
        message: "✅ Đã tạo lại invoice thành công",
        invoicePath: invoiceUrl,
        order: order
      });
    } catch (invoiceError) {
      console.error("Invoice generation error:", invoiceError);
      res.status(500).json({
        message: "Lỗi khi tạo invoice",
        error: invoiceError.message
      });
    }
  } catch (error) {
    res.status(500).json({ 
      message: "Error regenerating invoice", 
      error: error.message 
    });
  }
};

// Admin: Update order purchase time
const updateOrderTimestamp = async (req, res) => {
  try {
    const { purchasedAt } = req.body;

    if (!purchasedAt) {
      return res.status(400).json({ message: "Thiếu thời gian đơn hàng" });
    }

    const parsedDate = new Date(purchasedAt);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: "Thời gian không hợp lệ" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Update createdAt/updatedAt without auto timestamps
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          createdAt: parsedDate,
          updatedAt: parsedDate
        }
      },
      { new: true, timestamps: false }
    ).populate("user", "name email");

    res.status(200).json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: "Error updating order time", error: error.message });
  }
};

// Admin: Regenerate All Invoices (tạo lại tất cả invoice có local path)
const regenerateAllInvoices = async (req, res) => {
  try {
    // Tìm tất cả đơn hàng có invoicePath là local path (bắt đầu bằng /invoices/)
    const ordersWithLocalInvoice = await Order.find({
      status: { $in: ["paid", "completed", "delivered"] },
      invoicePath: { $regex: "^/invoices/" } // Local path
    });

    if (ordersWithLocalInvoice.length === 0) {
      return res.status(200).json({
        message: "Không có invoice nào cần tạo lại",
        count: 0
      });
    }

    const results = {
      success: [],
      failed: []
    };

    // Regenerate từng invoice
    for (const order of ordersWithLocalInvoice) {
      try {
        const invoiceUrl = await generateInvoicePDF(order._id);
        order.invoicePath = invoiceUrl;
        await order.save();
        
        results.success.push({
          orderId: order._id,
          invoicePath: invoiceUrl
        });
      } catch (error) {
        console.error(`Error regenerating invoice for order ${order._id}:`, error);
        results.failed.push({
          orderId: order._id,
          error: error.message
        });
      }
    }

    res.status(200).json({
      message: `Đã tạo lại ${results.success.length}/${ordersWithLocalInvoice.length} invoice`,
      success: results.success.length,
      failed: results.failed.length,
      details: results
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Error regenerating all invoices", 
      error: error.message 
    });
  }
};

// 🟢 Assign custom QR code to order (Admin only)
const assignCustomQRToOrder = async (req, res) => {
  try {
    const { customQRId } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    // Validate customQRId if provided
    if (customQRId) {
      const CustomQR = require("../models/customQR");
      const customQR = await CustomQR.findById(customQRId);
      if (!customQR) {
        return res.status(404).json({ message: "Không tìm thấy QR code" });
      }
      order.customQRCode = customQRId;
    } else {
      // Remove custom QR code
      order.customQRCode = null;
    }

    await order.save();
    await order.populate('customQRCode');

    res.status(200).json({
      message: customQRId ? "Đã gán QR code cho đơn hàng" : "Đã xóa QR code khỏi đơn hàng",
      order
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Lỗi server khi gán QR code", 
      error: error.message 
    });
  }
};

// 🟢 Download invoice gốc (PDF)
const downloadInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('customQRCode');

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    // Kiểm tra quyền: user chỉ có thể download invoice của chính mình, admin có thể download tất cả
    if (req.user.role !== 'admin' && order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Bạn không có quyền download invoice này" });
    }

    if (!order.invoicePath) {
      return res.status(404).json({ message: "Invoice chưa được tạo cho đơn hàng này" });
    }

    // Nếu invoicePath là Cloudinary URL, redirect hoặc trả về URL
    if (order.invoicePath.startsWith('http://') || order.invoicePath.startsWith('https://')) {
      return res.status(200).json({
        message: "Invoice URL",
        invoiceUrl: order.invoicePath,
        downloadUrl: order.invoicePath
      });
    }

    // Nếu là local file, đọc và trả về file
    const fs = require("fs");
    const path = require("path");
    const invoicePath = path.join(__dirname, "..", "..", order.invoicePath);

    if (!fs.existsSync(invoicePath)) {
      return res.status(404).json({ message: "File invoice không tồn tại trên server" });
    }

    // Set headers để download file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice_${order._id}.pdf"`);
    
    // Đọc và stream file
    const fileStream = fs.createReadStream(invoicePath);
    fileStream.pipe(res);
  } catch (error) {
    res.status(500).json({ 
      message: "Lỗi server khi download invoice", 
      error: error.message 
    });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  getDashboardStats,
  regenerateInvoice,
  regenerateAllInvoices,
  updateOrderTimestamp,
  downloadInvoice,
  assignCustomQRToOrder
};
