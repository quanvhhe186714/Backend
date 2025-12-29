const CustomQR = require("../models/customQR");
const mongoose = require("mongoose");

// 🟢 Tạo QR code tùy chỉnh mới (Admin only)
const createCustomQR = async (req, res) => {
  try {
    // Validate file (required cho create)
    if (!req.file) {
      console.error("No file uploaded. Request body:", req.body);
      // Set CORS headers before error response
      const origin = req.headers.origin;
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "https://backend-cy6b.onrender.com",
        "https://frontend-ten-snowy-70.vercel.app",
        "https://shopnambs.id.vn"
      ];
      if (allowedOrigins.includes(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
      }
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
      res.header("Access-Control-Allow-Credentials", "true");
      return res.status(400).json({ message: "Vui lòng chọn file ảnh QR code" });
    }

    // Validate và parse request body
    const { name, transactionCode, content, amount, bank, accountName, accountNo, orderId, isActive } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: "Tên QR code là bắt buộc" });
    }

    // Validate số tài khoản - chỉ cho phép số (0-9)
    if (accountNo && accountNo.trim() !== '') {
      if (!/^[0-9]+$/.test(accountNo)) {
        return res.status(400).json({ message: "Số tài khoản chỉ được chứa số (0-9)" });
      }
    }

    // Lấy imageUrl từ file đã upload
    const imageUrl = req.file.secure_url || req.file.path;
    
    if (!imageUrl) {
      console.error("No imageUrl from uploaded file:", req.file);
      return res.status(400).json({ message: "Lỗi khi lấy URL ảnh từ file đã upload" });
    }

    // Xử lý orderId - cho phép cả ObjectId và string
    let processedOrderId = null;
    if (orderId && orderId.trim() !== '') {
      // Cho phép lưu dưới dạng string hoặc ObjectId (model sẽ tự xử lý)
      processedOrderId = orderId;
    }

    // Tạo QR code mới
    const customQR = new CustomQR({
      name: name.trim(),
      imageUrl,
      transactionCode: transactionCode || "",
      content: content || "",
      amount: amount ? parseFloat(amount) : null,
      bank: bank || "mb",
      accountName: accountName || "",
      accountNo: accountNo || "",
      orderId: processedOrderId,
      createdBy: req.user._id,
      isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : true
    });

    await customQR.save();

    res.status(201).json({
      message: "Tạo QR code tùy chỉnh thành công",
      customQR
    });
  } catch (error) {
    console.error("Error creating custom QR:", error);
    // Set CORS headers before error response
    const origin = req.headers.origin;
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "https://backend-cy6b.onrender.com",
      "https://frontend-ten-snowy-70.vercel.app",
      "https://shopnambs.id.vn"
    ];
    if (allowedOrigins.includes(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.header("Access-Control-Allow-Credentials", "true");
    res.status(500).json({ 
      message: error.message || "Lỗi server khi tạo QR code tùy chỉnh", 
      error: error.message 
    });
  }
};

// 🟢 Lấy tất cả QR codes (Admin only)
const getAllCustomQRs = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chỉ admin mới được xem danh sách QR code." });
    }

    const { isActive, orderId } = req.query;
    let query = {};

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (orderId) {
      query.orderId = orderId;
    }

    const customQRs = await CustomQR.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    // Populate orderId chỉ khi nó là ObjectId hợp lệ
    const customQRsWithPopulated = await Promise.all(
      customQRs.map(async (qr) => {
        if (qr.orderId && mongoose.Types.ObjectId.isValid(qr.orderId)) {
          try {
            await qr.populate('orderId', 'totalAmount status');
          } catch (populateError) {
            // Nếu populate lỗi (orderId không tồn tại), giữ nguyên orderId
            console.warn(`Cannot populate orderId ${qr.orderId}:`, populateError.message);
          }
        }
        return qr;
      })
    );

    res.status(200).json(customQRsWithPopulated);
  } catch (error) {
    console.error("Error getting custom QR codes:", error);
    res.status(500).json({ 
      message: "Lỗi server khi lấy danh sách QR code", 
      error: error.message 
    });
  }
};

// 🟢 Lấy QR code theo ID
const getCustomQRById = async (req, res) => {
  try {
    const customQR = await CustomQR.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!customQR) {
      return res.status(404).json({ message: "Không tìm thấy QR code" });
    }

    // Populate orderId chỉ khi nó là ObjectId hợp lệ
    if (customQR.orderId && mongoose.Types.ObjectId.isValid(customQR.orderId)) {
      try {
        await customQR.populate('orderId', 'totalAmount status');
      } catch (populateError) {
        // Nếu populate lỗi, giữ nguyên orderId
        console.warn(`Cannot populate orderId ${customQR.orderId}:`, populateError.message);
      }
    }

    res.status(200).json(customQR);
  } catch (error) {
    console.error("Error getting custom QR by ID:", error);
    res.status(500).json({ 
      message: "Lỗi server khi lấy QR code", 
      error: error.message 
    });
  }
};

// 🟢 Cập nhật QR code (Admin only)
const updateCustomQR = async (req, res) => {
  try {
    // Tìm QR code cần update
    const customQR = await CustomQR.findById(req.params.id);
    if (!customQR) {
      return res.status(404).json({ message: "Không tìm thấy QR code" });
    }

    // Nếu có file mới, cập nhật imageUrl
    if (req.file) {
      const imageUrl = req.file.secure_url || req.file.path;
      if (!imageUrl) {
        console.error("No imageUrl from uploaded file:", req.file);
        return res.status(400).json({ message: "Lỗi khi lấy URL ảnh từ file đã upload" });
      }
      customQR.imageUrl = imageUrl;
    }

    // Validate số tài khoản nếu có cập nhật - chỉ cho phép số (0-9)
    if (req.body.accountNo !== undefined && req.body.accountNo && req.body.accountNo.trim() !== '') {
      if (!/^[0-9]+$/.test(req.body.accountNo)) {
        return res.status(400).json({ message: "Số tài khoản chỉ được chứa số (0-9)" });
      }
    }

    // Cập nhật các field khác
    if (req.body.name !== undefined) customQR.name = req.body.name.trim();
    if (req.body.transactionCode !== undefined) customQR.transactionCode = req.body.transactionCode;
    if (req.body.content !== undefined) customQR.content = req.body.content;
    if (req.body.amount !== undefined) {
      customQR.amount = req.body.amount ? parseFloat(req.body.amount) : null;
    }
    if (req.body.bank !== undefined) customQR.bank = req.body.bank;
    if (req.body.accountName !== undefined) customQR.accountName = req.body.accountName;
    if (req.body.accountNo !== undefined) customQR.accountNo = req.body.accountNo;
    
    // Xử lý orderId - cho phép cả ObjectId và string
    if (req.body.orderId !== undefined) {
      if (req.body.orderId === '' || req.body.orderId === null) {
        customQR.orderId = null;
      } else {
        // Cho phép lưu dưới dạng string hoặc ObjectId (model sẽ tự xử lý)
        customQR.orderId = req.body.orderId;
      }
    }
    
    if (req.body.isActive !== undefined) {
      customQR.isActive = req.body.isActive === 'true' || req.body.isActive === true;
    }

    customQR.updatedAt = new Date();
    await customQR.save();

    res.status(200).json({
      message: "Cập nhật QR code thành công",
      customQR
    });
  } catch (error) {
    console.error("Error updating custom QR:", error);
    res.status(500).json({ 
      message: error.message || "Lỗi server khi cập nhật QR code", 
      error: error.message 
    });
  }
};

// 🟢 Xóa QR code (Admin only)
const deleteCustomQR = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chỉ admin mới được xóa QR code." });
    }

    const customQR = await CustomQR.findById(req.params.id);
    if (!customQR) {
      return res.status(404).json({ message: "Không tìm thấy QR code" });
    }

    await customQR.deleteOne();

    res.status(200).json({ message: "Xóa QR code thành công" });
  } catch (error) {
    res.status(500).json({ 
      message: "Lỗi server khi xóa QR code", 
      error: error.message 
    });
  }
};

module.exports = {
  createCustomQR,
  getAllCustomQRs,
  getCustomQRById,
  updateCustomQR,
  deleteCustomQR
};

