const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

// Load Models
const User = require("./src/models/users");
const Product = require("./src/models/product");
const Order = require("./src/models/order");
const Coupon = require("./src/models/coupon");

dotenv.config();

// Connect DB
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/telepremium")
  .then(() => console.log("DB Connected"))
  .catch(err => console.error(err));

const seedData = async () => {
    try {
        // Clear DB
        await User.deleteMany({});
        await Product.deleteMany({});
        await Order.deleteMany({});
        await Coupon.deleteMany({});
        console.log("Data cleared");

        // 1. Create Users
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash("123456", salt);

        const admin = await User.create({
            name: "Admin User",
            email: "admin@gmail.com",
            password: hashedPassword,
            role: "admin",
            status: "active"
        });

        const user = await User.create({
            name: "Test User",
            email: "user@gmail.com",
            password: hashedPassword,
            role: "customer",
            status: "active"
        });
        console.log("Users created");

        // 2. Create Products
        const products = await Product.insertMany([
            {
                name: "Premium 1 Tháng",
                description: "Trải nghiệm Telegram tốt nhất trong 1 tháng.",
                price: 130000,
                duration_months: 1,
                features: ["Double Limits", "4 GB Uploads", "Faster Download", "No Ads"],
                image: "https://cdn-icons-png.flaticon.com/512/2111/2111646.png",
                category: "OTHER"
            },
            {
                name: "Premium 3 Tháng",
                description: "Gói 3 tháng tiết kiệm.",
                price: 389000,
                duration_months: 3,
                features: ["Double Limits", "4 GB Uploads", "Faster Download", "No Ads", "Unique Reactions"],
                image: "https://cdn-icons-png.flaticon.com/512/2111/2111646.png",
                category: "OTHER"
            },
            {
                name: "Premium 6 Tháng",
                description: "Gói 6 tháng tối ưu chi phí.",
                price: 549000,
                duration_months: 6,
                features: ["Double Limits", "4 GB Uploads", "Faster Download", "No Ads", "Premium Stickers", "Animated Emoji Status"],
                image: "https://cdn-icons-png.flaticon.com/512/2111/2111646.png",
                category: "OTHER"
            },
            {
                name: "Premium 12 Tháng",
                description: "Gói 12 tháng giá tốt nhất.",
                price: 900000,
                duration_months: 12,
                features: ["All Premium Features", "Voice-to-Text", "Advanced Chat Management", "Profile Badge", "Animated Profile Pictures"],
                image: "https://cdn-icons-png.flaticon.com/512/2111/2111646.png",
                category: "OTHER"
            },
            // VIA
            {
                name: "VIA Facebook US Trust",
                description: "Tài khoản VIA FB US chất lượng, trust cao, dùng chạy ads/cày tool.",
                price: 120000,
                duration_months: 1,
                features: ["Nguồn sạch", "Mail/Pass đầy đủ", "Bảo hành 24h"],
                image: "https://cdn-icons-png.flaticon.com/512/733/733547.png",
                category: "VIA"
            },
            {
                name: "VIA Gmail Cổ",
                description: "VIA Gmail tuổi cao, hạn chế checkpoint, phù hợp nuôi lâu dài.",
                price: 95000,
                duration_months: 1,
                features: ["Trust cao", "Phục hồi dễ", "Bảo hành 24h"],
                image: "https://cdn-icons-png.flaticon.com/512/281/281769.png",
                category: "VIA"
            },
            {
                name: "ACC NGOẠI CỔ 2007 LIVE ADS",
                description: "ACC NGOẠI CỔ 2007 LIVE ADS CP MAIL FULL ID NGẮN ĐA SỐ CÓ THUÊ TICK XANH (HOTMAIL có thể bật 2FA, change all).",
                price: 250000,
                duration_months: 1,
                features: ["Full info", "Có thể bật 2FA", "Đa số đã thuê tick xanh", "Cho phép đổi toàn bộ thông tin"],
                image: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
                category: "VIA"
            },
            {
                name: "ACC NGOẠI CỔ 2008-2016 LIVE ADS",
                description: "ACC NGOẠI CỔ 2008-2016 LIVE ADS CP MAIL ĐA SỐ CÓ THUÊ TICK XANH (HOTMAIL có thể bật 2FA, change all).",
                price: 300000,
                duration_months: 1,
                features: ["Độ tin cậy cao", "Có thể bật 2FA", "Mail sạch", "Đa số có tick xanh"],
                image: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
                category: "VIA"
            },
            // PROXY
            {
                name: "Proxy Residential 4G VN 1 ngày",
                description: "Proxy dân cư 4G Việt Nam, đổi IP linh hoạt, ổn định.",
                price: 30000,
                duration_months: 1,
                features: ["IP sạch", "Đổi IP nhanh", "Băng thông tốt"],
                image: "https://cdn-icons-png.flaticon.com/512/2549/2549900.png",
                category: "PROXY"
            },
            {
                name: "Proxy Datacenter US 1 tháng",
                description: "Proxy Datacenter US tốc độ cao, giá tốt cho automation.",
                price: 150000,
                duration_months: 1,
                features: ["Tốc độ cao", "Ổn định", "Hỗ trợ HTTP/SOCKS5"],
                image: "https://cdn-icons-png.flaticon.com/512/4248/4248443.png",
                category: "PROXY"
            },
            // Dịch vụ MXH
            {
                name: "Tăng Follow TikTok (Real/Việt) 1k",
                description: "Dịch vụ tăng follow TikTok thật, tăng đều, hạn chế tụt.",
                price: 90000,
                duration_months: 1,
                features: ["Follow thật", "Bảo hành 7 ngày", "Tốc độ tùy chọn"],
                image: "https://cdn-icons-png.flaticon.com/512/3046/3046127.png",
                category: "DICH_VU_MXH"
            },
            {
                name: "Tăng Like Fanpage 1k",
                description: "Like fanpage chất lượng, hạn chế tụt, hỗ trợ target quốc gia.",
                price: 70000,
                duration_months: 1,
                features: ["Nguồn thật", "Bảo hành 7 ngày", "Target được"],
                image: "https://cdn-icons-png.flaticon.com/512/889/889221.png",
                category: "DICH_VU_MXH"
            }
        ]);
        console.log("Products created");

        // 3. Create Coupons
        await Coupon.create({
            code: "WELCOME",
            discountType: "percent",
            discountValue: 10,
            expirationDate: new Date("2025-12-31"),
            usageLimit: 1000
        });
        await Coupon.create({
            code: "SAVE50K",
            discountType: "amount",
            discountValue: 50000, // 50,000 VND
            minOrderValue: 200000,
            expirationDate: new Date("2025-12-31"),
            usageLimit: 50
        });
        console.log("Coupons created");

        // 4. Create Orders
        await Order.create([
            {
                user: user._id,
                items: [{
                    product: products[0]._id,
                    name: products[0].name,
                    price: products[0].price,
                    quantity: 1
                }],
                totalAmount: products[0].price,
                subTotal: products[0].price,
                status: "completed",
                createdAt: new Date("2023-10-01")
            },
            {
                user: user._id,
                items: [{
                    product: products[3]._id, // 1 Year
                    name: products[3].name,
                    price: products[3].price,
                    quantity: 1
                }],
                totalAmount: products[3].price,
                subTotal: products[3].price,
                status: "pending",
                createdAt: new Date()
            }
        ]);
        console.log("Orders created");

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seedData();

