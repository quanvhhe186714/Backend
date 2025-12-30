/**
 * Script đăng ký SePay
 * Hướng dẫn đăng ký tài khoản SePay và cấu hình webhook
 * 
 * Chạy: node scripts/registerSePay.js
 */

require("dotenv").config();

console.log(`
╔══════════════════════════════════════════════════════════════╗
║           HƯỚNG DẪN ĐĂNG KÝ VÀ CẤU HÌNH SEPAY              ║
╚══════════════════════════════════════════════════════════════╝

📋 THÔNG TIN TÀI KHOẢN:
   Số tài khoản: 77891011121314
   Tên chủ tài khoản: TRAN DANG LINH
   Ngân hàng: MB Bank (Military Bank)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 BƯỚC 1: ĐĂNG KÝ TÀI KHOẢN SEPAY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Truy cập: https://my.sepay.vn/register
2. Điền đầy đủ thông tin:
   - Email
   - Mật khẩu
   - Số điện thoại
   - Thông tin doanh nghiệp/cá nhân
3. Xác thực email và số điện thoại
4. Chọn gói dịch vụ phù hợp với nhu cầu

📚 Tài liệu: https://docs.sepay.vn/dang-ky-sepay.html

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 BƯỚC 2: KẾT NỐI TÀI KHOẢN NGÂN HÀNG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Đăng nhập vào tài khoản SePay: https://my.sepay.vn
2. Vào mục "Tài khoản ngân hàng" hoặc "Bank Accounts"
3. Thêm tài khoản ngân hàng:
   - Số tài khoản: 77891011121314
   - Tên chủ tài khoản: TRAN DANG LINH
   - Ngân hàng: MB Bank (Military Bank)
4. Xác thực tài khoản theo hướng dẫn của SePay

⚠️  LƯU Ý: SePay hiện hỗ trợ các ngân hàng:
   - TPBank
   - MSB
   - VietinBank
   - BIDV
   - OCB
   
   Nếu MB Bank chưa được hỗ trợ, bạn có thể:
   - Liên hệ SePay để hỏi về hỗ trợ MB Bank
   - Hoặc sử dụng tài khoản tại một trong các ngân hàng được hỗ trợ

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔑 BƯỚC 3: LẤY API TOKEN TỪ SEPAY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 CÁCH LẤY API TOKEN (CHÍNH XÁC):

1. Đăng nhập vào SePay Dashboard: https://my.sepay.vn

2. Vào mục "Cấu hình Công ty" (Company Settings)
   - Tìm trong menu chính hoặc sidebar

3. Chọn "API Access" hoặc "Truy cập API"
   - Trong phần cấu hình công ty, tìm mục "API Access"

4. Click nút "+ Thêm API" hoặc "Add API" (góc trên bên phải)

5. Điền thông tin:
   - Tên: Đặt tên bất kỳ (ví dụ: "Backend API" hoặc "Payment Integration")
   - Trạng thái: Chọn "Hoạt động" (Active)
   - Click "Thêm" hoặc "Add"

6. Sau khi tạo thành công:
   - ✅ API Token sẽ xuất hiện trong danh sách API Access
   - ✅ Copy API Token này (chỉ hiển thị 1 lần, lưu lại ngay!)

📝 CẤU TRÚC API TOKEN:
   - Format: Bearer token (dạng chuỗi dài)
   - Sử dụng trong header: Authorization: Bearer YOUR_API_TOKEN

⚠️  LƯU Ý QUAN TRỌNG:
   - API Token có toàn quyền truy cập (SePay chưa hỗ trợ phân quyền)
   - Bảo mật API Token cẩn thận, không commit vào git
   - Nếu quên, có thể tạo API Token mới và xóa token cũ

💡 WEBHOOK KHÔNG CẦN API TOKEN:
   - Webhook của bạn đã cấu hình "Không cần chứng thực"
   - Webhook vẫn hoạt động bình thường mà không cần API Token
   - API Token chỉ cần khi bạn muốn GỌI API của SePay (kiểm tra giao dịch, v.v.)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚙️  BƯỚC 4: CẤU HÌNH BIẾN MÔI TRƯỜNG (.env)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thêm các biến sau vào file .env:

# SePay Configuration
SEPAY_API_TOKEN=your_api_token_here
# Lưu ý: Webhook không cần API Token nếu đã cấu hình "Không cần chứng thực"
# API Token chỉ cần khi bạn muốn gọi API của SePay
SEPAY_ACCOUNT_NO=77891011121314
SEPAY_ACCOUNT_NAME=TRAN DANG LINH

# MB Bank Configuration (có thể dùng chung với SePay)
MB_BANK_BIN=970422
MB_BANK_ACCOUNT=77891011121314
MB_BANK_ACCOUNT_NAME=TRAN DANG LINH

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌐 BƯỚC 5: ĐĂNG KÝ WEBHOOK URL (ĐÃ HOÀN TẤT ✅)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ BẠN ĐÃ ĐĂNG KÝ WEBHOOK VỚI THÔNG TIN:
   - Tên webhook: TestPayment
   - URL: https://nodose-dede-unsoftening.ngrok-free.dev/api/webhook/sepay
   - Sự kiện: Có tiền vào
   - Tài khoản: MBBank - 77891011121314 - LinhTranDang
   - Chứng thực: Không cần chứng thực
   - Content Type: application/json

📝 CẤU HÌNH ĐÃ ĐƯỢC CẬP NHẬT TRONG CODE:
   - Route webhook: POST /api/webhook/sepay ✅
   - Code đã sẵn sàng nhận webhook từ SePay ✅

⚠️  LƯU Ý VỀ NGROK:
   - URL ngrok sẽ thay đổi mỗi lần khởi động lại (trừ khi dùng ngrok với tài khoản)
   - Khi URL ngrok thay đổi, bạn cần cập nhật lại trong SePay Dashboard
   - Để giữ URL cố định, đăng ký tài khoản ngrok và cấu hình domain tùy chỉnh

🔄 CẬP NHẬT WEBHOOK URL (nếu cần):
   1. Vào SePay Dashboard > Webhooks
   2. Tìm webhook "TestPayment"
   3. Click "Chỉnh sửa" hoặc "Edit"
   4. Cập nhật URL mới
   5. Lưu lại

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧪 BƯỚC 6: TEST WEBHOOK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Chạy server:
   npm start

2. Test webhook local:
   node scripts/testSePayWebhook.js

3. Kiểm tra logs trong console để xem webhook có hoạt động không

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📞 HỖ TRỢ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Tài liệu SePay: https://docs.sepay.vn
- Email hỗ trợ: support@sepay.vn
- Hotline: (kiểm tra trên website SePay)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ SAU KHI HOÀN TẤT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ✅ Đã đăng ký tài khoản SePay
2. ✅ Đã kết nối tài khoản ngân hàng
3. ✅ Đã lấy API Key và Secret Key
4. ✅ Đã cấu hình .env
5. ✅ Đã đăng ký Webhook URL
6. ✅ Đã test webhook thành công

🎉 Hệ thống đã sẵn sàng nhận thanh toán qua SePay!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

// Kiểm tra cấu hình hiện tại
console.log("\n📊 KIỂM TRA CẤU HÌNH HIỆN TẠI:\n");

const config = {
  SEPAY_API_KEY: process.env.SEPAY_API_KEY ? "✅ Đã cấu hình" : "❌ Chưa cấu hình",
  SEPAY_SECRET_KEY: process.env.SEPAY_SECRET_KEY ? "✅ Đã cấu hình" : "❌ Chưa cấu hình",
  SEPAY_WEBHOOK_SECRET: process.env.SEPAY_WEBHOOK_SECRET ? "✅ Đã cấu hình" : "❌ Chưa cấu hình",
  SEPAY_ACCOUNT_NO: process.env.SEPAY_ACCOUNT_NO || "77891011121314",
  SEPAY_ACCOUNT_NAME: process.env.SEPAY_ACCOUNT_NAME || "TRAN DANG LINH",
};

console.log(`API Key: ${config.SEPAY_API_KEY}`);
console.log(`Secret Key: ${config.SEPAY_SECRET_KEY}`);
console.log(`Webhook Secret: ${config.SEPAY_WEBHOOK_SECRET}`);
console.log(`Số tài khoản: ${config.SEPAY_ACCOUNT_NO}`);
console.log(`Tên chủ tài khoản: ${config.SEPAY_ACCOUNT_NAME}`);

if (!process.env.SEPAY_API_KEY || !process.env.SEPAY_SECRET_KEY) {
  console.log("\n⚠️  Vui lòng cấu hình SEPAY_API_KEY và SEPAY_SECRET_KEY trong file .env");
}

console.log("\n");

