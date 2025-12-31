const CustomQR = require("../models/customQR");
const mongoose = require("mongoose");

/**
 * Controller: Tạo QR code tuỳ chỉnh mới (Admin only)
 * Yêu cầu mới (2024-06-xx):
 *  - Chỉ bắt buộc 3 trường: bank, accountName, accountNo
 *  - Ảnh QR có thể có hoặc không (tuỳ chọn)
 *  - Các trường khác như name, transactionCode, content, amount, orderId, isActive là tuỳ chọn
 */
const createCustomQR = async (req, res) => {
  try {
    const {
      name,
      transactionCode,
      content,
      amount,
      bank,
      accountName,
      accountNo,
      orderId,
      isActive,
    } = req.body;

    // Validate các field bắt buộc mới
    if (!bank || !accountName || !accountNo || !content || !amount) {
      return res.status(400).json({
        message: "Thiếu trường bắt buộc: bank, accountName, accountNo, content, amount",
      });
    }

    // Validate accountNo chỉ chứa số
    if (!/^[0-9]+$/.test(accountNo)) {
      return res.status(400).json({ message: "Số tài khoản chỉ được chứa số (0-9)" });
    }

    // Lấy URL ảnh QR nếu có upload
    let imageUrl = null;
    if (req.file) {
      imageUrl = req.file.secure_url || req.file.path;
    }

    // Chuẩn hoá orderId để lưu (giữ nguyên logic cũ cho phép string/ObjectId/rỗng)
    let processedOrderId = null;
    if (orderId && orderId.trim() !== "") {
      processedOrderId = orderId;
    }

    const customQR = new CustomQR({
      name: name?.trim() || "", // không còn bắt buộc
      imageUrl, // có thể null
      transactionCode: transactionCode || "",
      content: content || "",
      amount: amount ? parseFloat(amount) : null,
      bank: bank.trim(),
      accountName: accountName.trim(),
      accountNo: accountNo.trim(),
      orderId: processedOrderId,
      createdBy: req.user._id,
      isActive: isActive !== undefined ? isActive === "true" || isActive === true : true,
    });

    await customQR.save();

    return res.status(201).json({ message: "Tạo QR code tuỳ chỉnh thành công", customQR });
  } catch (error) {
    console.error("Error creating custom QR:", error);
    return res.status(500).json({
      message: error.message || "Lỗi server khi tạo QR code tuỳ chỉnh",
      error: error.message,
    });
  }
};

/*********************************
 * Các controller còn lại GIỮ NGUYÊN từ phiên bản cũ
 *********************************/

// 🟢 Lấy tất cả QR codes (Admin only)
const getAllCustomQRs = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Chỉ admin mới được xem danh sách QR code." });
    }

    const { isActive, orderId } = req.query;
    let query = {};

    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    if (orderId) {
      query.orderId = orderId;
    }

    const customQRs = await CustomQR.find(query)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    // Populate orderId chỉ khi nó là ObjectId hợp lệ
    const customQRsWithPopulated = await Promise.all(
      customQRs.map(async (qr) => {
        if (qr.orderId && mongoose.Types.ObjectId.isValid(qr.orderId)) {
          try {
            await qr.populate("orderId", "totalAmount status");
          } catch (e) {
            console.warn(`Cannot populate orderId ${qr.orderId}:`, e.message);
          }
        }
        return qr;
      })
    );

    res.status(200).json(customQRsWithPopulated);
  } catch (error) {
    console.error("Error getting custom QR codes:", error);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách QR code", error: error.message });
  }
};

// 🟢 Publish một QR code để hiển thị trên trang "Thanh toán qua QR" (Admin only)
const publishCustomQR = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Chỉ admin mới được publish QR code." });
    }

    const { id } = req.params;

    const customQR = await CustomQR.findById(id);
    if (!customQR) {
      return res.status(404).json({ message: "Không tìm thấy QR code" });
    }

    // Chỉ cho phép publish QR đang active
    if (!customQR.isActive) {
      return res.status(400).json({ message: "Chỉ có thể publish QR đang ở trạng thái kích hoạt." });
    }

    customQR.isPublished = true;
    customQR.publishedAt = new Date();
    customQR.publishedBy = req.user._id;

    await customQR.save();

    res.status(200).json({ message: "Publish QR code thành công", customQR });
  } catch (error) {
    console.error("Error publishing custom QR:", error);
    res.status(500).json({ message: "Lỗi server khi publish QR code", error: error.message });
  }
};

// 🟢 Gỡ publish QR code (Admin only)
const unpublishCustomQR = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Chỉ admin mới được gỡ publish QR code." });
    }

    const { id } = req.params;

    const customQR = await CustomQR.findById(id);
    if (!customQR) {
      return res.status(404).json({ message: "Không tìm thấy QR code" });
    }

    customQR.isPublished = false;
    await customQR.save();

    res.status(200).json({ message: "Gỡ publish QR code thành công", customQR });
  } catch (error) {
    console.error("Error unpublishing custom QR:", error);
    res.status(500).json({ message: "Lỗi server khi gỡ publish QR code", error: error.message });
  }
};

// 🟢 Lấy QR code đang được publish cho trang "Thanh toán qua QR" (đã ẩn thông tin nhạy cảm)
const getPublishedCustomQRs = async (req, res) => {
  try {
    const customQRs = await CustomQR.find({ isPublished: true, isActive: true })
      .populate("createdBy", "name email")
      .select("-accountName -accountNo -transactionCode -content")
      .sort({ publishedAt: -1 });

    res.status(200).json(customQRs);
  } catch (error) {
    console.error("Error getting published custom QR codes:", error);
    res.status(500).json({ message: "Lỗi server khi lấy QR code đã publish", error: error.message });
  }
};

// 🟢 Lấy chi tiết đầy đủ của QR code đang publish (khi user chọn QR)
const getPublishedQRDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const customQR = await CustomQR.findOne({ _id: id, isPublished: true, isActive: true }).populate(
      "createdBy",
      "name email"
    );

    if (!customQR) {
      return res.status(404).json({ message: "Không tìm thấy QR code hoặc QR code không còn được publish" });
    }

    res.status(200).json(customQR);
  } catch (error) {
    console.error("Error getting published QR detail:", error);
    res.status(500).json({ message: "Lỗi server khi lấy chi tiết QR code", error: error.message });
  }
};

// 🟢 Lấy QR code theo ID
const getCustomQRById = async (req, res) => {
  try {
    const customQR = await CustomQR.findById(req.params.id).populate("createdBy", "name email");

    if (!customQR) {
      return res.status(404).json({ message: "Không tìm thấy QR code" });
    }

    // Populate orderId nếu là ObjectId hợp lệ
    if (customQR.orderId && mongoose.Types.ObjectId.isValid(customQR.orderId)) {
      try {
        await customQR.populate("orderId", "totalAmount status");
      } catch (e) {
        console.warn(`Cannot populate orderId ${customQR.orderId}:`, e.message);
      }
    }

    res.status(200).json(customQR);
  } catch (error) {
    console.error("Error getting custom QR by ID:", error);
    res.status(500).json({ message: "Lỗi server khi lấy QR code", error: error.message });
  }
};

// 🟢 Cập nhật QR code (Admin only)
const updateCustomQR = async (req, res) => {
  try {
    const customQR = await CustomQR.findById(req.params.id);
    if (!customQR) {
      return res.status(404).json({ message: "Không tìm thấy QR code" });
    }

    // Nếu có file mới, cập nhật imageUrl
    if (req.file) {
      const imageUrl = req.file.secure_url || req.file.path;
      customQR.imageUrl = imageUrl;
    }

    // Validate accountNo nếu có cập nhật
    if (req.body.accountNo !== undefined && req.body.accountNo && !/^[0-9]+$/.test(req.body.accountNo)) {
      return res.status(400).json({ message: "Số tài khoản chỉ được chứa số (0-9)" });
    }

    // Cập nhật các field khác (bỏ required cho name)
    [
      "name",
      "transactionCode",
      "content",
      "amount",
      "bank",
      "accountName",
      "accountNo",
      "orderId",
      "isActive",
    ].forEach((field) => {
      if (req.body[field] !== undefined) {
        customQR[field] = req.body[field] === "" ? null : req.body[field];
      }
    });

    if (req.body.amount !== undefined) {
      customQR.amount = req.body.amount ? parseFloat(req.body.amount) : null;
    }

    customQR.updatedAt = new Date();
    await customQR.save();

    res.status(200).json({ message: "Cập nhật QR code thành công", customQR });
  } catch (error) {
    console.error("Error updating custom QR:", error);
    res.status(500).json({ message: error.message || "Lỗi server khi cập nhật QR code", error: error.message });
  }
};

// 🟢 Xoá QR code (Admin only)
const deleteCustomQR = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Chỉ admin mới được xoá QR code." });
    }

    const customQR = await CustomQR.findById(req.params.id);
    if (!customQR) {
      return res.status(404).json({ message: "Không tìm thấy QR code" });
    }

    await customQR.deleteOne();
    res.status(200).json({ message: "Xoá QR code thành công" });
  } catch (error) {
    console.error("Error deleting QR code:", error);
    res.status(500).json({ message: "Lỗi server khi xoá QR code", error: error.message });
  }
};

// 🟢 Lấy danh sách QR codes công khai (Public – không cần auth)
const getPublicCustomQRs = async (req, res) => {
  try {
    const customQRs = await CustomQR.find({ isActive: true })
      .select("-createdBy -orderId")
      .sort({ createdAt: -1 });

    res.status(200).json(customQRs);
  } catch (error) {
    console.error("Error getting public custom QR codes:", error);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách QR code công khai", error: error.message });
  }
};

module.exports = {
  createCustomQR,
  getAllCustomQRs,
  getCustomQRById,
  updateCustomQR,
  deleteCustomQR,
  getPublicCustomQRs,
  publishCustomQR,
  unpublishCustomQR,
  getPublishedCustomQRs,
  getPublishedQRDetail,
};
