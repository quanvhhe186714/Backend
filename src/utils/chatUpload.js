const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cloudinary = require("../../config/cloudinary");
const { Readable } = require("stream");

// Sử dụng memory storage để có thể upload lên Cloudinary
// Trên Render, filesystem là ephemeral nên cần lưu lên Cloudinary
const storage = multer.memoryStorage();

// Fallback: tạo thư mục local nếu cần (cho dev)
const CHAT_UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "chat");
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
ensureDir(CHAT_UPLOAD_DIR);

const allowedMimes = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-zip",
]);

// Danh sách extension được phép (fallback nếu MIME type không chính xác)
const allowedExtensions = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg",
  ".pdf",
  ".doc", ".docx",
  ".xls", ".xlsx",
  ".txt",
  ".zip"
]);

const uploadChatAttachments = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 10MB
    files: 5,
  },
  fileFilter: (req, file, cb) => {
    // Kiểm tra MIME type
    if (allowedMimes.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    
    // Fallback: kiểm tra extension nếu MIME type không khớp (đặc biệt cho ZIP)
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.has(ext)) {
      cb(null, true);
      return;
    }
    
    cb(
      new Error(
        "Định dạng file không hỗ trợ. Cho phép: hình ảnh, PDF, DOC/DOCX, XLS/XLSX, TXT, ZIP."
      )
    );
  },
});

// Middleware để upload file lên Cloudinary sau khi multer xử lý
const uploadToCloudinary = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  // Kiểm tra xem có Cloudinary config không (hỗ trợ cả CLOUDINARY_URL và các biến riêng lẻ)
  const hasCloudinary = process.env.CLOUDINARY_URL || 
                        (process.env.CLOUDINARY_NAME && 
                         process.env.CLOUDINARY_KEY && 
                         process.env.CLOUDINARY_SECRET);

  if (!hasCloudinary) {
    // Không có Cloudinary config - lưu local (cho dev)
    console.warn("⚠️ Cloudinary not configured, saving files locally (files will be lost on Render restart)");
    try {
      for (const file of req.files) {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
        const ext = path.extname(file.originalname) || "";
        const filename = `${uniqueName}${ext}`;
        const filepath = path.join(CHAT_UPLOAD_DIR, filename);
        
        fs.writeFileSync(filepath, file.buffer);
        file.filename = filename;
        file.cloudinaryUrl = null; // Không có Cloudinary URL
      }
      return next();
    } catch (error) {
      console.error("Error saving files locally:", error);
      return res.status(500).json({
        message: "Lỗi khi lưu file",
        error: error.message,
      });
    }
  }

  // Có Cloudinary config - upload lên Cloudinary
  try {
    const uploadPromises = req.files.map(async (file) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "mmos/chat",
            resource_type: "auto", // Tự động detect loại file
            use_filename: true,
            unique_filename: true,
          },
          (error, result) => {
            if (error) {
              console.error("Cloudinary upload error:", error);
              reject(error);
            } else {
              // Lưu Cloudinary URL vào file object
              file.cloudinaryUrl = result.secure_url;
              file.cloudinaryPublicId = result.public_id;
              // Tạo filename fallback (nếu cần)
              file.filename = path.basename(result.public_id);
              resolve(result);
            }
          }
        );

        // Tạo stream từ buffer
        const bufferStream = new Readable();
        bufferStream.push(file.buffer);
        bufferStream.push(null);
        bufferStream.pipe(stream);
      });
    });

    await Promise.all(uploadPromises);
    console.log(`✅ Uploaded ${req.files.length} file(s) to Cloudinary`);
    next();
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    return res.status(500).json({
      message: "Lỗi khi upload file lên Cloudinary",
      error: error.message,
    });
  }
};

module.exports = { uploadChatAttachments, uploadToCloudinary };


