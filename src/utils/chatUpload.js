const multer = require("multer");
const path = require("path");
const fs = require("fs");

const CHAT_UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "chat");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

ensureDir(CHAT_UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, CHAT_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname) || "";
    cb(null, `${uniqueName}${ext}`);
  },
});

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
]);

const uploadChatAttachments = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5,
  },
  fileFilter: (req, file, cb) => {
    if (allowedMimes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Định dạng file không hỗ trợ. Cho phép: hình ảnh, PDF, DOC/DOCX, XLS/XLSX, TXT, ZIP."
        )
      );
    }
  },
});

module.exports = { uploadChatAttachments };


