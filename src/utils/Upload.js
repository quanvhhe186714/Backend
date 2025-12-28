const multer = require("multer");
const cloudinary = require("../../config/cloudinary");

// Validate cloudinary trước khi sử dụng
if (!cloudinary || !cloudinary.uploader) {
  console.error("❌ Cloudinary is not properly configured!");
  throw new Error("Cloudinary configuration is missing or invalid. Please check your environment variables.");
}

// Import CloudinaryStorage - thử cách import trực tiếp
// Với multer-storage-cloudinary v2.x, có thể cần dùng cách này:
let CloudinaryStorage;
try {
  // Cách 1: Destructuring (theo documentation)
  const msc = require("multer-storage-cloudinary");
  CloudinaryStorage = msc.CloudinaryStorage;
  
  // Nếu không có, thử các cách khác
  if (!CloudinaryStorage || typeof CloudinaryStorage !== 'function') {
    CloudinaryStorage = msc.default || msc;
  }
  
  // Validate cuối cùng
  if (!CloudinaryStorage || typeof CloudinaryStorage !== 'function') {
    throw new Error('Cannot find CloudinaryStorage constructor');
  }
} catch (error) {
  console.error('Error loading multer-storage-cloudinary:', error);
  throw new Error('Failed to load CloudinaryStorage. Please run: npm install multer-storage-cloudinary');
}

// ⚙️ Cấu hình storage upload thẳng lên Cloudinary
let storage;
try {
  storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: "mmos/custom-qr", // 📁 tên thư mục trên Cloudinary cho QR codes
      allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
      transformation: [{ width: 500, height: 500, crop: "limit" }], // Resize ảnh
    },
  });
  console.log("✅ CloudinaryStorage initialized successfully");
} catch (error) {
  console.error("❌ Error initializing CloudinaryStorage:", error);
  throw new Error(`Failed to initialize CloudinaryStorage: ${error.message}`);
}

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
