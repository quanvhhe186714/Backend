const CustomQR = require("../models/customQR");
const { upload } = require("../utils/Upload");

// 🟢 Tạo QR code tùy chỉnh mới (Admin only)
const createCustomQR = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chỉ admin mới được tạo QR code tùy chỉnh." });
    }

    upload.single("qrImage")(req, res, async (err) => {
      try {
        if (err) {
          return res.status(400).json({ 
            message: err.message || "Lỗi khi upload file",
            error: err.code || "UPLOAD_ERROR"
          });
        }

        if (!req.file) {
          return res.status(400).json({ message: "Vui lòng chọn file ảnh QR code" });
        }

        const { name, transactionCode, content, amount, bank, accountName, accountNo, orderId, isActive } = req.body;
        
        if (!name) {
          return res.status(400).json({ message: "Tên QR code là bắt buộc" });
        }

        const imageUrl = req.file.secure_url || req.file.path;

        const customQR = new CustomQR({
          name,
          imageUrl,
          transactionCode: transactionCode || "",
          content: content || "",
          amount: amount ? parseFloat(amount) : null,
          bank: bank || "mb",
          accountName: accountName || "",
          accountNo: accountNo || "",
          orderId: orderId || null,
          createdBy: req.user._id,
          isActive: isActive !== undefined ? isActive === 'true' || isActive === true : true
        });

        await customQR.save();

        res.status(201).json({
          message: "Tạo QR code tùy chỉnh thành công",
          customQR
        });
      } catch (error) {
        console.error("Error creating custom QR:", error);
        res.status(500).json({ 
          message: "Lỗi server khi tạo QR code tùy chỉnh", 
          error: error.message 
        });
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Lỗi server khi tạo QR code tùy chỉnh", 
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
      .populate('orderId', 'totalAmount status')
      .sort({ createdAt: -1 });

    res.status(200).json(customQRs);
  } catch (error) {
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
      .populate('createdBy', 'name email')
      .populate('orderId', 'totalAmount status');

    if (!customQR) {
      return res.status(404).json({ message: "Không tìm thấy QR code" });
    }

    res.status(200).json(customQR);
  } catch (error) {
    res.status(500).json({ 
      message: "Lỗi server khi lấy QR code", 
      error: error.message 
    });
  }
};

// 🟢 Cập nhật QR code (Admin only)
const updateCustomQR = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chỉ admin mới được cập nhật QR code." });
    }

    // Nếu có file mới, upload lên Cloudinary trước
    upload.single("qrImage")(req, res, async (err) => {
      try {
        if (err) {
          return res.status(400).json({ 
            message: err.message || "Lỗi khi upload file",
            error: err.code || "UPLOAD_ERROR"
          });
        }

        const customQR = await CustomQR.findById(req.params.id);
        if (!customQR) {
          return res.status(404).json({ message: "Không tìm thấy QR code" });
        }

        // Nếu có file mới, cập nhật imageUrl
        if (req.file) {
          const imageUrl = req.file.secure_url || req.file.path;
          customQR.imageUrl = imageUrl;
        }

        // Cập nhật các field khác
        if (req.body.name) customQR.name = req.body.name;
        if (req.body.transactionCode !== undefined) customQR.transactionCode = req.body.transactionCode;
        if (req.body.content !== undefined) customQR.content = req.body.content;
        if (req.body.amount !== undefined) customQR.amount = req.body.amount ? parseFloat(req.body.amount) : null;
        if (req.body.bank) customQR.bank = req.body.bank;
        if (req.body.accountName !== undefined) customQR.accountName = req.body.accountName;
        if (req.body.accountNo !== undefined) customQR.accountNo = req.body.accountNo;
        if (req.body.orderId !== undefined) customQR.orderId = req.body.orderId || null;
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
        res.status(500).json({ 
          message: "Lỗi server khi cập nhật QR code", 
          error: error.message 
        });
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Lỗi server khi cập nhật QR code", 
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

