// controllers/fileController.js
const path = require("path");
const fs = require("fs");
const https = require("https");
const http = require("http");
const { protect } = require("../middleware/authMiddleware");

/**
 * Download file với Content-Disposition header để đảm bảo extension được thêm vào
 */
const downloadFile = async (req, res) => {
  try {
    const { fileUrl, filename } = req.query;

    if (!fileUrl) {
      return res.status(400).json({ message: "Thiếu fileUrl" });
    }

    // Xác định filename từ query hoặc từ URL
    let finalFilename = filename;
    if (!finalFilename) {
      // Lấy filename từ URL
      const urlParts = fileUrl.split("/");
      finalFilename = urlParts[urlParts.length - 1];
      
      // Nếu không có extension, thử lấy từ originalName trong database
      // (cần implement nếu cần)
    }

    // Đảm bảo filename có extension
    if (!path.extname(finalFilename)) {
      // Detect extension từ URL hoặc context
      if (fileUrl.includes("invoice") || fileUrl.includes("mmos/invoices")) {
        finalFilename = `${finalFilename}.pdf`;
      } else if (fileUrl.includes(".zip") || fileUrl.includes("zip")) {
        finalFilename = `${finalFilename}.zip`;
      } else if (fileUrl.includes(".txt") || fileUrl.includes("txt")) {
        finalFilename = `${finalFilename}.txt`;
      } else if (fileUrl.includes(".docx") || fileUrl.includes("docx")) {
        finalFilename = `${finalFilename}.docx`;
      } else if (fileUrl.includes(".doc") || fileUrl.includes("doc")) {
        finalFilename = `${finalFilename}.doc`;
      } else if (fileUrl.includes(".xlsx") || fileUrl.includes("xlsx")) {
        finalFilename = `${finalFilename}.xlsx`;
      } else if (fileUrl.includes(".xls") || fileUrl.includes("xls")) {
        finalFilename = `${finalFilename}.xls`;
      } else if (fileUrl.includes(".pdf") || fileUrl.includes("pdf")) {
        finalFilename = `${finalFilename}.pdf`;
      }
    }

    // Nếu là Cloudinary URL
    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      // Download từ Cloudinary/external URL
      const protocol = fileUrl.startsWith("https") ? https : http;
      
      protocol.get(fileUrl, (response) => {
        if (response.statusCode !== 200) {
          return res.status(response.statusCode).json({ 
            message: "Không thể tải file" 
          });
        }

        // Set headers để force download với tên file đúng
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(finalFilename)}"`);
        res.setHeader("Content-Type", response.headers["content-type"] || "application/octet-stream");
        
        // Pipe response
        response.pipe(res);
      }).on("error", (error) => {
        console.error("Download error:", error);
        res.status(500).json({ message: "Lỗi khi tải file" });
      });
    } else {
      // Local file
      const filePath = path.join(__dirname, "..", "..", fileUrl);
      
      // Kiểm tra file tồn tại
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File không tồn tại" });
      }

      // Set headers
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(finalFilename)}"`);
      res.setHeader("Content-Type", "application/octet-stream");
      
      // Send file
      res.sendFile(path.resolve(filePath));
    }
  } catch (error) {
    console.error("Download file error:", error);
    res.status(500).json({ message: "Lỗi server khi tải file", error: error.message });
  }
};

/**
 * Download file từ message attachment với originalName
 */
const downloadMessageFile = async (req, res) => {
  try {
    const { messageId, attachmentIndex } = req.params;
    const Message = require("../models/message");
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Tin nhắn không tồn tại" });
    }

    if (!message.attachments || !message.attachments[attachmentIndex]) {
      return res.status(404).json({ message: "File không tồn tại" });
    }

    const attachment = message.attachments[attachmentIndex];
    const fileUrl = attachment.url;
    const originalName = attachment.originalName || `file_${attachmentIndex}`;

    // Đảm bảo originalName có extension
    let filename = originalName;
    if (!path.extname(filename)) {
      // Detect extension từ mimeType
      const mimeToExt = {
        "application/pdf": ".pdf",
        "application/zip": ".zip",
        "application/x-zip-compressed": ".zip",
        "application/msword": ".doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
        "application/vnd.ms-excel": ".xls",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
        "text/plain": ".txt",
      };
      
      if (attachment.mimeType && mimeToExt[attachment.mimeType]) {
        filename = `${filename}${mimeToExt[attachment.mimeType]}`;
      }
    }

    // Nếu là Cloudinary URL
    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      const protocol = fileUrl.startsWith("https") ? https : http;
      
      protocol.get(fileUrl, (response) => {
        if (response.statusCode !== 200) {
          return res.status(response.statusCode).json({ 
            message: "Không thể tải file" 
          });
        }

        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
        res.setHeader("Content-Type", response.headers["content-type"] || attachment.mimeType || "application/octet-stream");
        
        response.pipe(res);
      }).on("error", (error) => {
        console.error("Download error:", error);
        res.status(500).json({ message: "Lỗi khi tải file" });
      });
    } else {
      // Local file
      const filePath = path.join(__dirname, "..", "..", fileUrl);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File không tồn tại" });
      }

      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader("Content-Type", attachment.mimeType || "application/octet-stream");
      
      res.sendFile(path.resolve(filePath));
    }
  } catch (error) {
    console.error("Download message file error:", error);
    res.status(500).json({ message: "Lỗi server khi tải file", error: error.message });
  }
};

module.exports = {
  downloadFile,
  downloadMessageFile,
};

