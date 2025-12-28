# 🔄 Hướng dẫn cập nhật file .env

## Cập nhật thông tin bank của Quân

Thay thế các dòng cấu hình bank cũ bằng thông tin mới:

### ❌ XÓA các dòng sau:

```env
# MB Bank (Mặc định)
MB_BANK_BIN=970422
MB_BANK_ACCOUNT=03355778899
MB_BANK_ACCOUNT_NAME=NGO VAN NAM
MB_BANK_PHONE=03355778899

# CAKE Bank (Tùy chọn)
CAKE_BANK_BIN=970422
CAKE_BANK_ACCOUNT=0334443570
CAKE_BANK_ACCOUNT_NAME=NGO VAN NAM
```

### ✅ THÊM các dòng sau:

```env
# ============================================
# Payment Configuration - MB Bank
# ============================================
MB_BANK_BIN=970422
MB_BANK_ACCOUNT=39397939686879
MB_BANK_ACCOUNT_NAME=NGUYEN THANH NHAN
MB_BANK_PHONE=
```

## 📝 File .env hoàn chỉnh mẫu:

```env
PORT=9999
MONGO_URI=mongodb+srv://quan2004:quan2004@nambs.afmynnz.mongodb.net/?appName=NamBS
JWT_SECRET=your_secret_key

# ============================================
# Payment Configuration - MB Bank
# ============================================
MB_BANK_BIN=970422
MB_BANK_ACCOUNT=39397939686879
MB_BANK_ACCOUNT_NAME=NGUYEN THANH NHAN
MB_BANK_PHONE=

# ============================================
# Cloudinary Configuration (nếu có)
# ============================================
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_KEY=your_cloudinary_api_key
CLOUDINARY_SECRET=your_cloudinary_api_secret
```

## ⚠️ Lưu ý:

1. Sau khi cập nhật, **khởi động lại server** để áp dụng thay đổi
2. Code đã được cập nhật để chỉ sử dụng MB Bank (NGUYEN THANH NHAN)
3. Nếu deploy lên Render, cập nhật các biến môi trường trong Render dashboard
4. Để sử dụng MB Bank, gọi API với `bank=mb` hoặc `bank=mbbank` hoặc `bank=mb bank` (mặc định là `mb`)

