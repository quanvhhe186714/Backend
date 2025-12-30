/**
 * Script tự động sửa cấu hình QR code trong file .env
 * Chạy: node scripts/fixQRConfig.js
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║      TỰ ĐỘNG SỬA CẤU HÌNH QR CODE                        ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// Đọc file .env
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
  console.log('✅ Đã đọc file .env\n');
} else {
  console.log('❌ Không tìm thấy file .env, sẽ tạo file mới\n');
}

// Cấu hình đúng cần set
const correctConfig = {
  'MB_BANK_ACCOUNT': '77891011121314',
  'MB_BANK_ACCOUNT_NAME': 'TRAN DANG LINH',
  'SEPAY_ACCOUNT_NO': '77891011121314',
  'SEPAY_ACCOUNT_NAME': 'TRAN DANG LINH',
  'MB_BANK_BIN': '970422',
};

// Tách các dòng trong file .env
const lines = envContent.split('\n');
const newLines = [];
const updatedVars = [];
const addedVars = [];

// Xử lý từng dòng
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  // Bỏ qua comment và dòng trống
  if (!line || line.startsWith('#')) {
    newLines.push(lines[i]);
    continue;
  }
  
  // Tách key và value
  const match = line.match(/^([^=]+)=(.*)$/);
  if (!match) {
    newLines.push(lines[i]);
    continue;
  }
  
  const key = match[1].trim();
  const value = match[2].trim().replace(/^["']|["']$/g, ''); // Bỏ dấu ngoặc kép nếu có
  
  // Kiểm tra xem có cần sửa không
  if (correctConfig.hasOwnProperty(key)) {
    if (value !== correctConfig[key]) {
      newLines.push(`${key}=${correctConfig[key]}`);
      updatedVars.push({ key, oldValue: value, newValue: correctConfig[key] });
      delete correctConfig[key]; // Đánh dấu đã xử lý
    } else {
      newLines.push(lines[i]); // Giữ nguyên nếu đã đúng
      delete correctConfig[key]; // Đánh dấu đã xử lý
    }
  } else {
    newLines.push(lines[i]); // Giữ nguyên các biến khác
  }
}

// Thêm các biến còn thiếu
for (const [key, value] of Object.entries(correctConfig)) {
  newLines.push(`${key}=${value}`);
  addedVars.push({ key, value });
}

// Ghi lại file .env
const newContent = newLines.join('\n');
fs.writeFileSync(envPath, newContent, 'utf8');

// Hiển thị kết quả
console.log('📝 Kết quả:\n');

if (updatedVars.length > 0) {
  console.log('✅ Đã cập nhật các biến sau:');
  updatedVars.forEach(({ key, oldValue, newValue }) => {
    console.log(`   ${key}`);
    console.log(`     Cũ: ${oldValue}`);
    console.log(`     Mới: ${newValue}\n`);
  });
}

if (addedVars.length > 0) {
  console.log('✅ Đã thêm các biến sau:');
  addedVars.forEach(({ key, value }) => {
    console.log(`   ${key}=${value}\n`);
  });
}

if (updatedVars.length === 0 && addedVars.length === 0) {
  console.log('✅ Tất cả cấu hình đã đúng!\n');
}

console.log('⚠️  QUAN TRỌNG: Cần restart server để áp dụng thay đổi!');
console.log('   Chạy: npm start\n');

