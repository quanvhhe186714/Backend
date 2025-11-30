// routes/files.js
const express = require("express");
const router = express.Router();
const { downloadFile, downloadMessageFile } = require("../controllers/fileController");
const { protect } = require("../middleware/authMiddleware");

// Download file với filename (có thể public hoặc protected)
router.get("/download", downloadFile);

// Download file từ message (cần đăng nhập)
router.get("/messages/:messageId/attachments/:attachmentIndex", protect, downloadMessageFile);

module.exports = router;

