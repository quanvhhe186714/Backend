const express = require("express");
const router = express.Router();
const customQRController = require("../controllers/customQRController");
const { protect, isAdmin } = require("../middleware/authMiddleware");
const { upload } = require("../utils/Upload");

// Middleware để xử lý lỗi multer
// Multer sẽ tự động gọi next(err) nếu có lỗi
const handleUploadError = (err, req, res, next) => {
  if (err) {
    console.error("Upload error:", err);
    // Multer errors có thể có code như 'LIMIT_FILE_SIZE', 'LIMIT_FILE_COUNT', etc.
    let statusCode = 400;
    let errorMessage = err.message || "Lỗi khi upload file";
    
    // Xử lý các lỗi cụ thể của multer
    if (err.code === 'LIMIT_FILE_SIZE') {
      errorMessage = "File quá lớn. Kích thước tối đa là 5MB";
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      errorMessage = "Chỉ được upload 1 file";
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      errorMessage = "Tên field không đúng. Phải là 'qrImage'";
    }
    
    return res.status(statusCode).json({ 
      message: errorMessage,
      error: err.code || "UPLOAD_ERROR"
    });
  }
  next();
};

// Tất cả routes đều yêu cầu admin
// POST: Create - file là required
router.post("/", protect, isAdmin, upload.single("qrImage"), handleUploadError, customQRController.createCustomQR);
router.get("/", protect, isAdmin, customQRController.getAllCustomQRs);
router.get("/:id", protect, customQRController.getCustomQRById);
// PUT: Update - file là optional
router.put("/:id", protect, isAdmin, upload.single("qrImage"), handleUploadError, customQRController.updateCustomQR);
router.delete("/:id", protect, isAdmin, customQRController.deleteCustomQR);

module.exports = router;

