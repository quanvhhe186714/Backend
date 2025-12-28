// Đảm bảo dotenv được load trước khi đọc env vars
require("dotenv").config();

const cloudinary = require("cloudinary").v2;

// Hỗ trợ cả CLOUDINARY_URL và các biến riêng lẻ
// Format CLOUDINARY_URL: cloudinary://api_key:api_secret@cloud_name
let configSuccess = false;

if (process.env.CLOUDINARY_URL) {
  try {
    // Parse CLOUDINARY_URL: cloudinary://api_key:api_secret@cloud_name
    const url = process.env.CLOUDINARY_URL;
    const match = url.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
    
    if (match) {
      const [, api_key, api_secret, cloud_name] = match;
      cloudinary.config({
        cloud_name,
        api_key,
        api_secret,
      });
      console.log("✅ Cloudinary configured via CLOUDINARY_URL");
      configSuccess = true;
    } else {
      throw new Error("Invalid CLOUDINARY_URL format");
    }
  } catch (error) {
    console.error("❌ Error parsing CLOUDINARY_URL:", error.message);
    console.warn("⚠️ Falling back to individual variables");
  }
}

if (!configSuccess && process.env.CLOUDINARY_NAME && process.env.CLOUDINARY_KEY && process.env.CLOUDINARY_SECRET) {
  // Fallback về các biến riêng lẻ
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
  });
  console.log("✅ Cloudinary configured via individual variables");
  configSuccess = true;
}

// Validate config
if (configSuccess) {
  // Kiểm tra xem cloudinary có uploader không
  if (!cloudinary.uploader) {
    console.error("❌ Cloudinary config failed: uploader is undefined");
    throw new Error("Cloudinary configuration failed. uploader is undefined.");
  }
  console.log("✅ Cloudinary uploader is available");
} else {
  console.error("❌ Cloudinary configuration missing!");
  console.error("Please set CLOUDINARY_URL or CLOUDINARY_NAME, CLOUDINARY_KEY, CLOUDINARY_SECRET");
  throw new Error("Cloudinary configuration is required. Please set CLOUDINARY_URL or individual variables.");
}

module.exports = cloudinary;
