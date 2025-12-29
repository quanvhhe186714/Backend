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
    
    // Đảm bảo CORS headers được set trước khi trả về error
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
    
    return res.status(statusCode).json({ 
      message: errorMessage,
      error: err.code || "UPLOAD_ERROR"
    });
  }
  next();
};

// Public route - không cần authentication
router.get("/public", customQRController.getPublicCustomQRs);

// QR đang publish cho trang \"Thanh toán qua QR\" - yêu cầu user đã đăng nhập
router.get("/published", protect, customQRController.getPublishedCustomQRs);
// Lấy chi tiết đầy đủ của QR đang publish (khi user chọn QR)
router.get("/published/:id", protect, customQRController.getPublishedQRDetail);

// Tất cả routes đều yêu cầu admin
// POST: Create - file là required
router.post("/", protect, isAdmin, upload.single("qrImage"), handleUploadError, customQRController.createCustomQR);
router.get("/", protect, isAdmin, customQRController.getAllCustomQRs);
router.get("/:id", protect, customQRController.getCustomQRById);
// PUT: Update - file là optional
router.put("/:id", protect, isAdmin, upload.single("qrImage"), handleUploadError, customQRController.updateCustomQR);
router.delete("/:id", protect, isAdmin, customQRController.deleteCustomQR);
router.post("/:id/publish", protect, isAdmin, customQRController.publishCustomQR);
router.post("/:id/unpublish", protect, isAdmin, customQRController.unpublishCustomQR);

module.exports = router;

