const fs = require("fs");
const path = require("path");
const https = require("https");
const PDFDocument = require("pdfkit");
const Order = require("../models/order");
const User = require("../models/users");
const cloudinary = require("../../config/cloudinary");

const BASE_DIR = path.resolve(__dirname, "..", "..");
const INVOICE_DIR = path.join(BASE_DIR, "invoices");
const FONT_DIR = path.join(BASE_DIR, "assets", "fonts");
const FONT_SOURCES = {
  regular: {
    filename: "NotoSans-Regular.ttf",
    url: "https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf",
  },
  bold: {
    filename: "NotoSans-Bold.ttf",
    url: "https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSans/NotoSans-Bold.ttf",
  },
};

function ensureInvoiceDir() {
  if (!fs.existsSync(INVOICE_DIR)) {
    fs.mkdirSync(INVOICE_DIR, { recursive: true });
  }
}

function ensureFontDir() {
  if (!fs.existsSync(FONT_DIR)) {
    fs.mkdirSync(FONT_DIR, { recursive: true });
  }
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          file.close();
          fs.unlink(dest, () => {});
          return reject(new Error(`Failed to download font: ${response.statusCode}`));
        }
        response.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", (err) => {
        file.close();
        fs.unlink(dest, () => {});
        reject(err);
      });
  });
}

async function ensureFontFiles() {
  ensureFontDir();
  const tasks = [];
  for (const key of Object.keys(FONT_SOURCES)) {
    const { filename, url } = FONT_SOURCES[key];
    const targetPath = path.join(FONT_DIR, filename);
    if (!fs.existsSync(targetPath)) {
      console.log(`[Invoice] Downloading ${filename} ...`);
      tasks.push(
        downloadFile(url, targetPath).catch((err) => {
          console.error(`[Invoice] Failed to download ${filename}:`, err.message);
        })
      );
    }
  }
  if (tasks.length) {
    await Promise.all(tasks);
  }
}

function getFontPath() {
  const candidates = [
    path.join(FONT_DIR, FONT_SOURCES.regular.filename),
    path.join(FONT_DIR, "DejaVuSans.ttf"),
    path.join(FONT_DIR, "Roboto-Regular.ttf"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function getBoldFontPath() {
  const candidates = [
    path.join(FONT_DIR, FONT_SOURCES.bold.filename),
    path.join(FONT_DIR, "DejaVuSans-Bold.ttf"),
    path.join(FONT_DIR, "Roboto-Bold.ttf"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function formatVND(amount) {
  try {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount || 0);
  } catch {
    return `${amount} đ`;
  }
}

async function generateInvoicePDF(orderId) {
  ensureInvoiceDir();
  await ensureFontFiles();

  const order = await Order.findById(orderId).populate("user", "name email");
  if (!order) throw new Error("Order not found");

  const user = await User.findById(order.user._id).select("name email");

  const filename = `invoice_${order._id}.pdf`;
  const filepath = path.join(INVOICE_DIR, filename);
  const doc = new PDFDocument({ margin: 50 });
  const stream = fs.createWriteStream(filepath);
  doc.pipe(stream);

  // Load Unicode-capable font if available (to render Vietnamese correctly)
  const normalFont = getFontPath();
  const boldFont = getBoldFontPath();
  try {
    if (normalFont) {
      doc.registerFont("VN-Regular", normalFont);
    }
    if (boldFont) {
      doc.registerFont("VN-Bold", boldFont);
    }
  } catch (e) {
    console.warn("Unable to register custom font:", e?.message || e);
  }
  const hasVN = !!normalFont;
  const hasBold = !!boldFont;
  if (!hasVN) {
    console.warn(
      "Unicode font not found. Place a TTF in backend/assets/fonts (e.g. NotoSans-Regular.ttf). Using PDFKit default may break Vietnamese text."
    );
  }
  if (hasVN) doc.font("VN-Regular");

  // Header
  if (hasBold) doc.font("VN-Bold");
  doc
    .fontSize(20)
    .fillColor("#222")
    .text("WEB BUFF MXH - Hóa đơn mua hàng", { align: "left" })
    .moveDown(0.5);
  if (hasVN) doc.font("VN-Regular");
  doc
    .fontSize(10)
    .fillColor("#555")
    .text(`Mã đơn: ${order._id}`)
    .text(`Ngày: ${new Date(order.createdAt).toLocaleString("vi-VN")}`)
    .text(`Trạng thái: ${order.status}`)
    .moveDown(0.8);

  // Buyer info
  if (hasBold) doc.font("VN-Bold");
  doc
    .fontSize(12)
    .fillColor("#222")
    .text("Thông tin khách hàng", { underline: true })
    .moveDown(0.3);
  if (hasVN) doc.font("VN-Regular");
  doc
    .fontSize(10)
    .fillColor("#000")
    .text(`Họ tên: ${user?.name || "N/A"}`)
    .text(`Email: ${user?.email || "N/A"}`);

  if (order.paymentDetails?.telegramUsername) {
    doc.text(`Telegram: ${order.paymentDetails.telegramUsername}`);
  }
  doc.moveDown(0.8);

  // Items table
  if (hasBold) doc.font("VN-Bold");
  doc
    .fontSize(12)
    .fillColor("#222")
    .text("Chi tiết đơn hàng", { underline: true })
    .moveDown(0.3);
  if (hasVN) doc.font("VN-Regular");

  const tableTop = doc.y + 5;
  const colX = [50, 300, 400, 480];

  doc.fontSize(10).fillColor("#333");
  doc.text("Sản phẩm", colX[0], tableTop);
  doc.text("Đơn giá", colX[1], tableTop);
  doc.text("Số lượng", colX[2], tableTop);
  doc.text("Thành tiền", colX[3], tableTop);

  let y = tableTop + 16;
  order.items.forEach((item) => {
    doc.fillColor("#000");
    doc.text(item.name || "", colX[0], y);
    doc.text(formatVND(item.price), colX[1], y);
    doc.text(String(item.quantity || 1), colX[2], y);
    doc.text(formatVND((item.price || 0) * (item.quantity || 1)), colX[3], y);
    y += 16;
  });

  y += 10;
  doc
    .fontSize(10)
    .fillColor("#333")
    .text(`Tạm tính: ${formatVND(order.subTotal || order.totalAmount)}`, 350, y, { align: "left" });
  y += 16;
  if (order.discountAmount) {
    doc.text(`Giảm giá: -${formatVND(order.discountAmount)}`, 350, y, { align: "left" });
    y += 16;
  }
  doc.text(`Tổng thanh toán: ${formatVND(order.totalAmount)}`, 350, y, { align: "left" });
  y += 24;

  doc.moveDown(1);
  doc.fontSize(9).fillColor("#666");
  doc.text("Lưu ý: Đây là chứng từ do hệ thống tạo tự động sau khi đơn hàng được xác nhận thanh toán.", {
    align: "left",
  });

  doc.end();

  await new Promise((resolve) => stream.on("finish", resolve));
  
  // Upload invoice lên Cloudinary (quan trọng cho Render - filesystem ephemeral)
  const hasCloudinary = process.env.CLOUDINARY_NAME && 
                        process.env.CLOUDINARY_KEY && 
                        process.env.CLOUDINARY_SECRET;
  
  if (hasCloudinary) {
    try {
      const uploadResult = await cloudinary.uploader.upload(filepath, {
        folder: "mmos/invoices",
        resource_type: "raw", // PDF là raw file
        use_filename: true,
        unique_filename: false,
        overwrite: false,
      });
      
      // Xóa file local sau khi upload (tiết kiệm dung lượng)
      try {
        fs.unlinkSync(filepath);
      } catch (unlinkError) {
        console.warn("Could not delete local invoice file:", unlinkError);
      }
      
      console.log(`✅ Invoice uploaded to Cloudinary: ${uploadResult.secure_url}`);
      // Trả về Cloudinary URL
      return uploadResult.secure_url;
    } catch (cloudinaryError) {
      console.error("Error uploading invoice to Cloudinary:", cloudinaryError);
      // Fallback: trả về local path nếu Cloudinary fail
      console.warn("⚠️ Falling back to local invoice path (file will be lost on Render restart)");
      return `/invoices/${filename}`;
    }
  } else {
    // Không có Cloudinary config - trả về local path (cho dev)
    console.warn("⚠️ Cloudinary not configured, invoice saved locally (will be lost on Render restart)");
    return `/invoices/${filename}`;
  }
}

module.exports = {
  generateInvoicePDF,
};


