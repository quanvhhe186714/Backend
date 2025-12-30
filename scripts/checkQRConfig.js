/**
 * Script kiểm tra cấu hình QR code
 * Chạy: node scripts/checkQRConfig.js
 */

require("dotenv").config();

console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log("║      KIỂM TRA CẤU HÌNH QR CODE                            ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

// Kiểm tra các biến môi trường
const envVars = {
  "MB_BANK_ACCOUNT": process.env.MB_BANK_ACCOUNT,
  "MB_BANK_ACCOUNT_NAME": process.env.MB_BANK_ACCOUNT_NAME,
  "SEPAY_ACCOUNT_NO": process.env.SEPAY_ACCOUNT_NO,
  "SEPAY_ACCOUNT_NAME": process.env.SEPAY_ACCOUNT_NAME,
  "MB_BANK_BIN": process.env.MB_BANK_BIN,
};

console.log("📋 Giá trị biến môi trường hiện tại:\n");
Object.entries(envVars).forEach(([key, value]) => {
  const status = value ? "✅" : "❌";
  const displayValue = value || "(chưa set)";
  console.log(`${status} ${key}: ${displayValue}`);
});

// Tính toán giá trị cuối cùng (theo logic trong paymentController.js)
const accountNo = process.env.MB_BANK_ACCOUNT || process.env.SEPAY_ACCOUNT_NO || "77891011121314";
const accountName = process.env.MB_BANK_ACCOUNT_NAME || process.env.SEPAY_ACCOUNT_NAME || "TRAN DANG LINH";
const bin = process.env.MB_BANK_BIN || "970422";

console.log("\n📊 Giá trị sẽ được sử dụng:\n");
console.log(`✅ Số tài khoản: ${accountNo}`);
console.log(`✅ Tên chủ TK: ${accountName}`);
console.log(`✅ BIN: ${bin}`);

// Kiểm tra xem có phải "Nguyen Thanh Nhan" không
if (accountName.includes("Nguyen Thanh Nhan") || accountName.includes("Nguyen")) {
  console.log("\n⚠️  CẢNH BÁO: Tên chủ tài khoản vẫn là 'Nguyen Thanh Nhan'!");
  console.log("   Cần cập nhật file .env và restart server.\n");
} else {
  console.log("\n✅ Tên chủ tài khoản đã đúng!\n");
}

// Hướng dẫn fix
console.log("🔧 Cách sửa:\n");
console.log("1. Mở file .env trong thư mục Backend");
console.log("2. Thêm hoặc cập nhật các dòng sau:\n");
console.log("   MB_BANK_ACCOUNT=77891011121314");
console.log("   MB_BANK_ACCOUNT_NAME=TRAN DANG LINH");
console.log("   SEPAY_ACCOUNT_NO=77891011121314");
console.log("   SEPAY_ACCOUNT_NAME=TRAN DANG LINH");
console.log("   MB_BANK_BIN=970422\n");
console.log("3. Lưu file .env");
console.log("4. Restart server: npm start\n");

// Test URL QR
const testAmount = 100000;
const testContent = "TEST-123";
const qrUrl = `https://img.vietqr.io/image/${bin}-${accountNo}-compact2.png?amount=${testAmount}&addInfo=${encodeURIComponent(testContent)}&accountName=${encodeURIComponent(accountName)}`;

console.log("🔗 URL QR code test:\n");
console.log(qrUrl);
console.log("\n💡 Mở URL này trong browser để xem QR code\n");

