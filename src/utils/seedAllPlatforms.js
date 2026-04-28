/**
 * Seed dịch vụ cho tất cả platforms: TikTok, YouTube, Instagram, Twitter, Telegram
 * Chạy: node Backend/src/utils/seedAllPlatforms.js
 */
require("dotenv").config();
const mongoose = require("mongoose");

let FacebookServiceModel;
try {
  if (mongoose.models.FacebookService) {
    FacebookServiceModel = mongoose.models.FacebookService;
  } else {
    FacebookServiceModel = require("../models/facebookService");
  }
} catch (e) {
  FacebookServiceModel = require("../models/facebookService");
}

const allPlatformServices = [
  // ===================== TIKTOK =====================
  {
    platform: "tiktok",
    name: "Buff Tim Video TikTok",
    code: "TT_LIKE_VIDEO",
    description: "Tăng lượt tim (like) cho video TikTok. Tốc độ nhanh, tim thật từ tài khoản Việt Nam.",
    icon: "🎵",
    serviceType: "LIKE_POST",
    requiredFields: ["post_url"],
    basePrice: 25000,
    unit: "1000",
    unitLabel: "tim",
    processingTime: 5,
    completionTime: 60,
    warrantyDays: 30,
    status: "stable",
    dropRate: 5,
    isActive: true,
    displayOrder: 1,
    priceTable: [
      { quantity: 1000, price: 25000 },
      { quantity: 5000, price: 120000 },
      { quantity: 10000, price: 230000 },
      { quantity: 50000, price: 1100000 },
      { quantity: 100000, price: 2100000 }
    ]
  },
  {
    platform: "tiktok",
    name: "Buff Follow TikTok",
    code: "TT_FOLLOW",
    description: "Tăng người theo dõi TikTok thật, profile công khai. Bảo hành 30 ngày nếu tụt.",
    icon: "🎵",
    serviceType: "FOLLOW",
    requiredFields: ["post_url"],
    basePrice: 35000,
    unit: "1000",
    unitLabel: "follow",
    processingTime: 10,
    completionTime: 120,
    warrantyDays: 30,
    status: "stable",
    dropRate: 8,
    isActive: true,
    displayOrder: 2,
    priceTable: [
      { quantity: 1000, price: 35000 },
      { quantity: 5000, price: 165000 },
      { quantity: 10000, price: 320000 }
    ]
  },
  {
    platform: "tiktok",
    name: "Buff View Video TikTok",
    code: "TT_VIEW_VIDEO",
    description: "Tăng lượt xem video TikTok, giúp video lên xu hướng nhanh hơn.",
    icon: "🎵",
    serviceType: "VIEW_VIDEO",
    requiredFields: ["post_url"],
    basePrice: 8000,
    unit: "1000",
    unitLabel: "view",
    processingTime: 3,
    completionTime: 30,
    warrantyDays: 7,
    status: "stable",
    dropRate: 0,
    isActive: true,
    displayOrder: 3,
    priceTable: [
      { quantity: 1000, price: 8000 },
      { quantity: 10000, price: 75000 },
      { quantity: 100000, price: 700000 }
    ]
  },
  {
    platform: "tiktok",
    name: "Buff Comment TikTok",
    code: "TT_COMMENT",
    description: "Tăng bình luận tùy chỉnh cho video TikTok. Comment tự nhiên từ tài khoản thật.",
    icon: "🎵",
    serviceType: "COMMENT",
    requiredFields: ["post_url"],
    basePrice: 80000,
    unit: "1000",
    unitLabel: "comment",
    processingTime: 15,
    completionTime: 180,
    warrantyDays: 15,
    status: "stable",
    dropRate: 3,
    isActive: true,
    displayOrder: 4,
    priceTable: [
      { quantity: 100, price: 10000 },
      { quantity: 500, price: 45000 },
      { quantity: 1000, price: 80000 }
    ]
  },
  {
    platform: "tiktok",
    name: "Buff Share Video TikTok",
    code: "TT_SHARE",
    description: "Tăng lượt chia sẻ video TikTok, viral video nhanh hơn.",
    icon: "🎵",
    serviceType: "SHARE_POST",
    requiredFields: ["post_url"],
    basePrice: 40000,
    unit: "1000",
    unitLabel: "share",
    processingTime: 10,
    completionTime: 90,
    warrantyDays: 7,
    status: "stable",
    dropRate: 2,
    isActive: true,
    displayOrder: 5,
    priceTable: [
      { quantity: 1000, price: 40000 },
      { quantity: 5000, price: 190000 }
    ]
  },
  {
    platform: "tiktok",
    name: "Buff Mắt Livestream TikTok",
    code: "TT_VIEW_LIVESTREAM",
    description: "Tăng số người xem livestream TikTok theo thời gian thực.",
    icon: "🎵",
    serviceType: "VIEW_LIVESTREAM",
    requiredFields: ["livestream_url"],
    basePrice: 50000,
    unit: "1000",
    unitLabel: "mắt",
    processingTime: 2,
    completionTime: 60,
    warrantyDays: 0,
    status: "stable",
    dropRate: 0,
    isActive: true,
    displayOrder: 6,
    priceTable: [
      { quantity: 100, price: 6000 },
      { quantity: 500, price: 27000 },
      { quantity: 1000, price: 50000 }
    ]
  },

  // ===================== YOUTUBE =====================
  {
    platform: "youtube",
    name: "Buff Like Video YouTube",
    code: "YT_LIKE_VIDEO",
    description: "Tăng lượt like cho video YouTube. Like từ tài khoản thật, bảo hành 30 ngày.",
    icon: "▶️",
    serviceType: "LIKE_POST",
    requiredFields: ["post_url"],
    basePrice: 30000,
    unit: "1000",
    unitLabel: "like",
    processingTime: 10,
    completionTime: 120,
    warrantyDays: 30,
    status: "stable",
    dropRate: 5,
    isActive: true,
    displayOrder: 1,
    priceTable: [
      { quantity: 1000, price: 30000 },
      { quantity: 5000, price: 140000 },
      { quantity: 10000, price: 270000 }
    ]
  },
  {
    platform: "youtube",
    name: "Buff View Video YouTube",
    code: "YT_VIEW_VIDEO",
    description: "Tăng lượt xem video YouTube. View giữ lâu, không ảo.",
    icon: "▶️",
    serviceType: "VIEW_VIDEO",
    requiredFields: ["post_url"],
    basePrice: 12000,
    unit: "1000",
    unitLabel: "view",
    processingTime: 5,
    completionTime: 60,
    warrantyDays: 7,
    status: "stable",
    dropRate: 0,
    isActive: true,
    displayOrder: 2,
    priceTable: [
      { quantity: 1000, price: 12000 },
      { quantity: 10000, price: 110000 },
      { quantity: 100000, price: 1000000 }
    ]
  },
  {
    platform: "youtube",
    name: "Buff Subscriber YouTube",
    code: "YT_SUBSCRIBE",
    description: "Tăng người đăng ký kênh YouTube thật, giúp kênh đạt điều kiện kiếm tiền.",
    icon: "▶️",
    serviceType: "FOLLOW",
    requiredFields: ["post_url"],
    basePrice: 60000,
    unit: "1000",
    unitLabel: "subscriber",
    processingTime: 30,
    completionTime: 480,
    warrantyDays: 60,
    status: "stable",
    dropRate: 10,
    isActive: true,
    displayOrder: 3,
    priceTable: [
      { quantity: 1000, price: 60000 },
      { quantity: 5000, price: 280000 }
    ]
  },
  {
    platform: "youtube",
    name: "Buff View 4000 giờ YouTube",
    code: "YT_VIEW_4000H",
    description: "Tăng giờ xem đạt điều kiện kiếm tiền YouTube (4000 giờ). An toàn, tự nhiên.",
    icon: "▶️",
    serviceType: "VIEW_VIDEO",
    requiredFields: ["post_url"],
    basePrice: 200000,
    unit: "1000",
    unitLabel: "giờ xem",
    processingTime: 60,
    completionTime: 2880,
    warrantyDays: 30,
    status: "stable",
    dropRate: 0,
    isActive: true,
    displayOrder: 4,
    priceTable: [
      { quantity: 1000, price: 200000 },
      { quantity: 4000, price: 750000 }
    ]
  },

  // ===================== INSTAGRAM =====================
  {
    platform: "instagram",
    name: "Buff Like Bài Viết Instagram",
    code: "IG_LIKE_POST",
    description: "Tăng lượt thích bài viết Instagram. Like từ tài khoản thật Việt Nam.",
    icon: "📸",
    serviceType: "LIKE_POST",
    requiredFields: ["post_url"],
    basePrice: 28000,
    unit: "1000",
    unitLabel: "like",
    processingTime: 5,
    completionTime: 60,
    warrantyDays: 30,
    status: "stable",
    dropRate: 5,
    isActive: true,
    displayOrder: 1,
    priceTable: [
      { quantity: 1000, price: 28000 },
      { quantity: 5000, price: 130000 },
      { quantity: 10000, price: 250000 }
    ]
  },
  {
    platform: "instagram",
    name: "Buff Follow Instagram",
    code: "IG_FOLLOW",
    description: "Tăng người theo dõi Instagram. Tài khoản thật, profile công khai.",
    icon: "📸",
    serviceType: "FOLLOW",
    requiredFields: ["fanpage_url"],
    basePrice: 40000,
    unit: "1000",
    unitLabel: "follow",
    processingTime: 15,
    completionTime: 180,
    warrantyDays: 30,
    status: "stable",
    dropRate: 10,
    isActive: true,
    displayOrder: 2,
    priceTable: [
      { quantity: 1000, price: 40000 },
      { quantity: 5000, price: 185000 }
    ]
  },
  {
    platform: "instagram",
    name: "Buff View Story Instagram",
    code: "IG_VIEW_STORY",
    description: "Tăng lượt xem story Instagram theo thời gian thực.",
    icon: "📸",
    serviceType: "VIEW_STORY",
    requiredFields: ["story_url"],
    basePrice: 15000,
    unit: "1000",
    unitLabel: "view",
    processingTime: 3,
    completionTime: 30,
    warrantyDays: 0,
    status: "stable",
    dropRate: 0,
    isActive: true,
    displayOrder: 3,
    priceTable: [
      { quantity: 1000, price: 15000 },
      { quantity: 5000, price: 70000 }
    ]
  },
  {
    platform: "instagram",
    name: "Buff Mắt Livestream Instagram",
    code: "IG_VIEW_LIVESTREAM",
    description: "Tăng số người xem livestream Instagram theo thời gian thực.",
    icon: "📸",
    serviceType: "VIEW_LIVESTREAM",
    requiredFields: ["livestream_url"],
    basePrice: 55000,
    unit: "1000",
    unitLabel: "mắt",
    processingTime: 2,
    completionTime: 60,
    warrantyDays: 0,
    status: "stable",
    dropRate: 0,
    isActive: true,
    displayOrder: 4,
    priceTable: [
      { quantity: 100, price: 7000 },
      { quantity: 500, price: 30000 },
      { quantity: 1000, price: 55000 }
    ]
  },

  // ===================== TWITTER / X =====================
  {
    platform: "twitter",
    name: "Buff Like Tweet Twitter (X)",
    code: "TW_LIKE_TWEET",
    description: "Tăng lượt thích tweet Twitter/X. Like từ tài khoản thật.",
    icon: "𝕏",
    serviceType: "LIKE_POST",
    requiredFields: ["post_url"],
    basePrice: 32000,
    unit: "1000",
    unitLabel: "like",
    processingTime: 5,
    completionTime: 60,
    warrantyDays: 30,
    status: "stable",
    dropRate: 5,
    isActive: true,
    displayOrder: 1,
    priceTable: [
      { quantity: 1000, price: 32000 },
      { quantity: 5000, price: 150000 }
    ]
  },
  {
    platform: "twitter",
    name: "Buff Follow Twitter (X)",
    code: "TW_FOLLOW",
    description: "Tăng người theo dõi Twitter/X. Tài khoản thật, bảo hành 30 ngày.",
    icon: "𝕏",
    serviceType: "FOLLOW",
    requiredFields: ["fanpage_url"],
    basePrice: 45000,
    unit: "1000",
    unitLabel: "follow",
    processingTime: 15,
    completionTime: 240,
    warrantyDays: 30,
    status: "stable",
    dropRate: 8,
    isActive: true,
    displayOrder: 2,
    priceTable: [
      { quantity: 1000, price: 45000 },
      { quantity: 5000, price: 210000 }
    ]
  },
  {
    platform: "twitter",
    name: "Buff Retweet Twitter (X)",
    code: "TW_RETWEET",
    description: "Tăng lượt retweet cho tweet của bạn, giúp nội dung viral nhanh hơn.",
    icon: "𝕏",
    serviceType: "SHARE_POST",
    requiredFields: ["post_url"],
    basePrice: 50000,
    unit: "1000",
    unitLabel: "retweet",
    processingTime: 10,
    completionTime: 120,
    warrantyDays: 7,
    status: "stable",
    dropRate: 3,
    isActive: true,
    displayOrder: 3,
    priceTable: [
      { quantity: 1000, price: 50000 },
      { quantity: 5000, price: 235000 }
    ]
  },
  {
    platform: "twitter",
    name: "Buff View Tweet Twitter (X)",
    code: "TW_VIEW",
    description: "Tăng lượt xem tweet Twitter/X nhanh chóng.",
    icon: "𝕏",
    serviceType: "VIEW_VIDEO",
    requiredFields: ["post_url"],
    basePrice: 10000,
    unit: "1000",
    unitLabel: "view",
    processingTime: 3,
    completionTime: 30,
    warrantyDays: 0,
    status: "stable",
    dropRate: 0,
    isActive: true,
    displayOrder: 4,
    priceTable: [
      { quantity: 1000, price: 10000 },
      { quantity: 10000, price: 95000 }
    ]
  },

  // ===================== TELEGRAM =====================
  {
    platform: "telegram",
    name: "Buff Member/Sub Telegram",
    code: "TG_MEMBER",
    description: "Tăng thành viên cho group hoặc kênh Telegram. Member thật, bảo hành 30 ngày.",
    icon: "✈️",
    serviceType: "MEMBER_GROUP",
    requiredFields: ["group_url"],
    basePrice: 45000,
    unit: "1000",
    unitLabel: "member",
    processingTime: 20,
    completionTime: 360,
    warrantyDays: 30,
    status: "stable",
    dropRate: 10,
    isActive: true,
    displayOrder: 1,
    priceTable: [
      { quantity: 1000, price: 45000 },
      { quantity: 5000, price: 210000 },
      { quantity: 10000, price: 400000 }
    ]
  },
  {
    platform: "telegram",
    name: "Buff View Bài Viết Telegram",
    code: "TG_VIEW_POST",
    description: "Tăng lượt xem bài viết (post) trong kênh Telegram. Tức thì, không cần token.",
    icon: "✈️",
    serviceType: "VIEW_VIDEO",
    requiredFields: ["post_url"],
    basePrice: 8000,
    unit: "1000",
    unitLabel: "view",
    processingTime: 2,
    completionTime: 15,
    warrantyDays: 0,
    status: "stable",
    dropRate: 0,
    isActive: true,
    displayOrder: 2,
    priceTable: [
      { quantity: 1000, price: 8000 },
      { quantity: 10000, price: 75000 },
      { quantity: 100000, price: 700000 }
    ]
  },
  {
    platform: "telegram",
    name: "Buff Cảm Xúc Bài Viết Telegram",
    code: "TG_REACTION",
    description: "Tăng reaction (cảm xúc) cho bài viết Telegram. Hỗ trợ tất cả loại emoji.",
    icon: "✈️",
    serviceType: "LIKE_POST",
    requiredFields: ["post_url"],
    basePrice: 20000,
    unit: "1000",
    unitLabel: "reaction",
    processingTime: 5,
    completionTime: 30,
    warrantyDays: 7,
    status: "stable",
    dropRate: 3,
    isActive: true,
    displayOrder: 3,
    priceTable: [
      { quantity: 1000, price: 20000 },
      { quantity: 5000, price: 95000 }
    ]
  }
];

const seedAllPlatforms = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    let created = 0;
    let skipped = 0;

    for (const service of allPlatformServices) {
      const existing = await FacebookServiceModel.findOne({ code: service.code });
      if (existing) {
        // Update platform field if missing
        if (!existing.platform) {
          await FacebookServiceModel.findByIdAndUpdate(existing._id, { platform: service.platform });
          console.log(`🔄 Updated platform for: ${service.name}`);
        } else {
          console.log(`⏭️  Skip (exists): ${service.name}`);
        }
        skipped++;
      } else {
        await FacebookServiceModel.create(service);
        console.log(`✅ Created: ${service.name}`);
        created++;
      }
    }

    console.log(`\n🎉 Done! Created: ${created}, Skipped: ${skipped}`);
  } catch (error) {
    console.error("❌ Seed error:", error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seedAllPlatforms();
