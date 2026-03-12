const mongoose = require("mongoose");
const dotenv = require("dotenv");
// Load Models
const Product = require("./src/models/product");

dotenv.config();

// Connect DB
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/telepremium")
  .then(() => console.log("DB Connected"))
  .catch(err => console.error(err));

const seedData = async () => {
    try {
        const existingNames = new Set(
            (await Product.find({}, { name: 1 })).map(p => p.name)
        );

        // Create Products (only new ones)
        const productsToInsert = [
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
                image: "https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg",
                category: "VIA"
            },
            {
                name: "ACC NGOẠI CỔ 2008-2016 LIVE ADS",
                description: "ACC NGOẠI CỔ 2008-2016 LIVE ADS CP MAIL ĐA SỐ CÓ THUÊ TICK XANH (HOTMAIL có thể bật 2FA, change all).",
                price: 300000,
                duration_months: 1,
                features: ["Độ tin cậy cao", "Có thể bật 2FA", "Mail sạch", "Đa số có tick xanh"],
                image: "https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg",
                category: "VIA"
            },
            // PROXY
            {
                name: "Proxy Lẻ",
                description: "Proxy chất lượng cao, sẵn có 5.180 proxy, phù hợp nhu cầu linh hoạt.",
                price: 2000,
                duration_months: 1,
                features: ["Sẵn có: 5180 proxy", "Giá lẻ 2.000đ", "Cam kết ổn định"],
                image: "https://cdn-icons-png.flaticon.com/512/2549/2549900.png",
                category: "PROXY"
            },
            {
                name: "Proxy Gói 500",
                description: "Gói 500 proxy cho chiến dịch số lượng lớn, giá ưu đãi.",
                price: 500000,
                duration_months: 1,
                features: ["500 proxy/gói", "Giá 500.000đ", "Bảo hành proxy"],
                image: "https://cdn-icons-png.flaticon.com/512/2549/2549900.png",
                category: "PROXY"
            },
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
            // SESSION
            {
                name: "Session +1 KÉO MEM",
                description: "Session +1 kéo mem ổn định, phù hợp nhóm nhỏ.",
                price: 29000,
                duration_months: 1,
                features: ["Sẵn có: 0", "Hỗ trợ 24/7", "Cam kết ổn định"],
                image: "https://cdn-icons-png.flaticon.com/512/3580/3580432.png",
                category: "SS"
            },
            {
                name: "Session +53 KÉO MEM",
                description: "Session +53 kéo mem nhanh, phù hợp chiến dịch mở rộng.",
                price: 29000,
                duration_months: 1,
                features: ["Sẵn có: 0", "Hỗ trợ 24/7", "Cam kết ổn định"],
                image: "https://cdn-icons-png.flaticon.com/512/3580/3580432.png",
                category: "SS"
            },
            {
                name: "Session +66 KÉO MEM",
                description: "Session +66 kéo mem hiệu quả, tối ưu chi phí.",
                price: 29000,
                duration_months: 1,
                features: ["Sẵn có: 0", "Hỗ trợ 24/7", "Cam kết ổn định"],
                image: "https://cdn-icons-png.flaticon.com/512/3580/3580432.png",
                category: "SS"
            },
            {
                name: "Session +86 KÉO MEM",
                description: "Session +86 kéo mem chất lượng, phù hợp thị trường quốc tế.",
                price: 29000,
                duration_months: 1,
                features: ["Sẵn có: 5", "Hỗ trợ 24/7", "Cam kết ổn định"],
                image: "https://cdn-icons-png.flaticon.com/512/3580/3580432.png",
                category: "SS"
            },
            {
                name: "Session Buff Cảm Xúc",
                description: "Buff cảm xúc nhanh và ổn định cho bài viết.",
                price: 16000,
                duration_months: 1,
                features: ["Sẵn có: 1190", "Tốc độ nhanh", "Bảo hành ổn định"],
                image: "https://cdn-icons-png.flaticon.com/512/742/742751.png",
                category: "SS"
            },
            {
                name: "Session Tương Tác Nhóm",
                description: "Tăng tương tác nhóm, hỗ trợ phát triển cộng đồng.",
                price: 16000,
                duration_months: 1,
                features: ["Sẵn có: 915", "Tăng tương tác", "Hỗ trợ 24/7"],
                image: "https://cdn-icons-png.flaticon.com/512/681/681494.png",
                category: "SS"
            },
            {
                name: "Session +1 Share Contact (US)",
                description: "Session +1 share contact thị trường US, ổn định.",
                price: 20000,
                duration_months: 1,
                features: ["Sẵn có: 47", "Khu vực: US", "Cam kết ổn định"],
                image: "https://cdn-icons-png.flaticon.com/512/197/197484.png",
                category: "SS"
            },
            {
                name: "Session +66 KÉO MEM (TH)",
                description: "Session +66 kéo mem cho thị trường Thái Lan.",
                price: 29000,
                duration_months: 1,
                features: ["Sẵn có: 0", "Khu vực: TH", "Cam kết ổn định"],
                image: "https://cdn-icons-png.flaticon.com/512/197/197452.png",
                category: "SS"
            },
            {
                name: "Session +91 Share Contact (IN)",
                description: "Session +91 share contact cho thị trường Ấn Độ.",
                price: 20000,
                duration_months: 1,
                features: ["Sẵn có: 54", "Khu vực: IN", "Cam kết ổn định"],
                image: "https://cdn-icons-png.flaticon.com/512/197/197419.png",
                category: "SS"
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
        ];

        const newProducts = productsToInsert.filter(p => !existingNames.has(p.name));
        if (newProducts.length > 0) {
            await Product.insertMany(newProducts);
        }
        console.log(`Products created: ${newProducts.length}`);

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seedData();

