const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../../config/cloudinary");

// ⚙️ Cấu hình storage upload thẳng lên Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "club-events", // 📁 tên thư mục trên Cloudinary
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ width: 500, height: 500, crop: "limit" }], // Resize ảnh
  },
});

const upload = multer({
  storage,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Kiểm tra file type
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh: JPG, PNG, GIF, WEBP'), false);
    }
  }
});

module.exports = { upload };
