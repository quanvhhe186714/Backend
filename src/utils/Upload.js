const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../../config/cloudinary");

// ⚙️ Cấu hình storage upload thẳng lên Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "club-events", // 📁 tên thư mục trên Cloudinary
    allowed_formats: ["jpg", "jpeg", "png", "gif"],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});
// commitlai
module.exports = { upload };
