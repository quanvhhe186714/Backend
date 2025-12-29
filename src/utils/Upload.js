const multer = require("multer");
// Import cloudinary trực tiếp để đảm bảo format đúng cho multer-storage-cloudinary
const cloudinaryModule = require("cloudinary");
const cloudinary = cloudinaryModule.v2;

// Validate cloudinary trước khi sử dụng
if (!cloudinary || !cloudinary.uploader) {
  console.error("❌ Cloudinary is not properly configured!");
  throw new Error("Cloudinary configuration is missing or invalid. Please check your environment variables.");
}

// Import CloudinaryStorage
let CloudinaryStorage;
try {
  const msc = require("multer-storage-cloudinary");
  CloudinaryStorage = msc.CloudinaryStorage;
  
  if (!CloudinaryStorage || typeof CloudinaryStorage !== 'function') {
    CloudinaryStorage = msc.default || msc;
  }
  
  if (!CloudinaryStorage || typeof CloudinaryStorage !== 'function') {
    throw new Error('Cannot find CloudinaryStorage constructor');
  }
} catch (error) {
  console.error('Error loading multer-storage-cloudinary:', error);
  throw new Error('Failed to load CloudinaryStorage. Please run: npm install multer-storage-cloudinary');
}

// ⚙️ Cấu hình storage upload thẳng lên Cloudinary
// multer-storage-cloudinary cần cloudinary object có v2 property
let storage;
try {
  // Tạo object với v2 property để multer-storage-cloudinary có thể truy cập cloudinary.v2.uploader
  const cloudinaryForStorage = {
    v2: cloudinary
  };
  
  storage = new CloudinaryStorage({
    cloudinary: cloudinaryForStorage,
    params: {
      folder: "mmos/custom-qr", // 📁 tên thư mục trên Cloudinary cho QR codes
      allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
      // Không resize ảnh QR code để đảm bảo mã QR vẫn quét được
      // Chỉ giới hạn kích thước file (5MB) ở multer limits
    },
  });
  console.log("✅ CloudinaryStorage initialized successfully");
} catch (error) {
  console.error("❌ Error initializing CloudinaryStorage:", error);
  console.error("Cloudinary check:", { 
    hasV2: !!cloudinary, 
    hasUploader: !!cloudinary.uploader,
    uploaderType: typeof cloudinary.uploader
  });
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
