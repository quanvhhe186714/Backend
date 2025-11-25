const FacebookService = require("../services/facebook/models/facebookService");

const facebookServices = [
  {
    name: "Tăng like bài viết",
    code: "LIKE_POST",
    description: "Tăng lượt like cho bài viết Facebook của bạn",
    icon: "👍",
    basePrice: 50000, // Giá cho 1000 likes
    unit: "1000",
    unitLabel: "lượt like",
    minPrice: 10000,
    processingTime: 5,
    completionTime: 60,
    serviceType: "LIKE_POST",
    requiredFields: ["post_url"],
    displayOrder: 1
  },
  {
    name: "Tăng like comment",
    code: "LIKE_COMMENT",
    description: "Tăng lượt like cho comment Facebook",
    icon: "👍",
    basePrice: 30000,
    unit: "1000",
    unitLabel: "lượt like",
    minPrice: 5000,
    processingTime: 5,
    completionTime: 30,
    serviceType: "LIKE_COMMENT",
    requiredFields: ["comment_url"],
    displayOrder: 2
  },
  {
    name: "Tăng like fanpage",
    code: "LIKE_FANPAGE",
    description: "Tăng lượt like cho fanpage Facebook",
    icon: "👍",
    basePrice: 80000,
    unit: "1000",
    unitLabel: "lượt like",
    minPrice: 20000,
    processingTime: 10,
    completionTime: 120,
    serviceType: "LIKE_FANPAGE",
    requiredFields: ["fanpage_url"],
    displayOrder: 3
  },
  {
    name: "Tăng like reels",
    code: "LIKE_REELS",
    description: "Tăng lượt like cho reels Facebook",
    icon: "👍",
    basePrice: 60000,
    unit: "1000",
    unitLabel: "lượt like",
    minPrice: 15000,
    processingTime: 5,
    completionTime: 60,
    serviceType: "LIKE_REELS",
    requiredFields: ["reels_url"],
    displayOrder: 4
  },
  {
    name: "Tăng sub/follow",
    code: "FOLLOW",
    description: "Tăng số lượng người theo dõi trang Facebook",
    icon: "👥",
    basePrice: 100000,
    unit: "1000",
    unitLabel: "người follow",
    minPrice: 30000,
    processingTime: 10,
    completionTime: 180,
    serviceType: "FOLLOW",
    requiredFields: ["fanpage_url"],
    displayOrder: 5
  },
  {
    name: "Tăng comment",
    code: "COMMENT",
    description: "Tăng số lượng comment cho bài viết",
    icon: "💬",
    basePrice: 70000,
    unit: "100",
    unitLabel: "comment",
    minPrice: 20000,
    processingTime: 10,
    completionTime: 120,
    serviceType: "COMMENT",
    requiredFields: ["post_url"],
    displayOrder: 6
  },
  {
    name: "Tăng comment reels",
    code: "COMMENT_REELS",
    description: "Tăng số lượng comment cho reels",
    icon: "💬",
    basePrice: 70000,
    unit: "100",
    unitLabel: "comment",
    minPrice: 20000,
    processingTime: 10,
    completionTime: 120,
    serviceType: "COMMENT_REELS",
    requiredFields: ["reels_url"],
    displayOrder: 7
  },
  {
    name: "Tăng share bài viết",
    code: "SHARE_POST",
    description: "Tăng lượt share cho bài viết Facebook",
    icon: "📤",
    basePrice: 90000,
    unit: "1000",
    unitLabel: "lượt share",
    minPrice: 25000,
    processingTime: 10,
    completionTime: 180,
    serviceType: "SHARE_POST",
    requiredFields: ["post_url"],
    displayOrder: 8
  },
  {
    name: "Tăng share vào group",
    code: "SHARE_GROUP",
    description: "Tăng lượt share bài viết vào các group",
    icon: "📤",
    basePrice: 100000,
    unit: "100",
    unitLabel: "lượt share",
    minPrice: 30000,
    processingTime: 15,
    completionTime: 240,
    serviceType: "SHARE_GROUP",
    requiredFields: ["post_url", "group_url"],
    displayOrder: 9
  },
  {
    name: "Tăng share livestream",
    code: "SHARE_LIVESTREAM",
    description: "Tăng lượt share cho livestream",
    icon: "📤",
    basePrice: 80000,
    unit: "1000",
    unitLabel: "lượt share",
    minPrice: 20000,
    processingTime: 5,
    completionTime: 60,
    serviceType: "SHARE_LIVESTREAM",
    requiredFields: ["livestream_url"],
    displayOrder: 10
  },
  {
    name: "Tăng share reels",
    code: "SHARE_REELS",
    description: "Tăng lượt share cho reels",
    icon: "📤",
    basePrice: 70000,
    unit: "1000",
    unitLabel: "lượt share",
    minPrice: 20000,
    processingTime: 5,
    completionTime: 60,
    serviceType: "SHARE_REELS",
    requiredFields: ["reels_url"],
    displayOrder: 11
  },
  {
    name: "Đánh giá 5* sao FANPAGE",
    code: "RATE_FANPAGE",
    description: "Tăng đánh giá 5 sao cho fanpage",
    icon: "⭐",
    basePrice: 150000,
    unit: "100",
    unitLabel: "đánh giá",
    minPrice: 50000,
    processingTime: 15,
    completionTime: 300,
    serviceType: "RATE_FANPAGE",
    requiredFields: ["fanpage_url"],
    displayOrder: 12
  },
  {
    name: "Tăng mắt livestream",
    code: "VIEW_LIVESTREAM",
    description: "Tăng số lượng người xem livestream",
    icon: "👁️",
    basePrice: 40000,
    unit: "1000",
    unitLabel: "người xem",
    minPrice: 10000,
    processingTime: 5,
    completionTime: 30,
    serviceType: "VIEW_LIVESTREAM",
    requiredFields: ["livestream_url"],
    displayOrder: 13
  },
  {
    name: "Tăng member group",
    code: "MEMBER_GROUP",
    description: "Tăng số lượng thành viên trong group",
    icon: "👥",
    basePrice: 120000,
    unit: "1000",
    unitLabel: "thành viên",
    minPrice: 40000,
    processingTime: 20,
    completionTime: 360,
    serviceType: "MEMBER_GROUP",
    requiredFields: ["group_url"],
    displayOrder: 14
  },
  {
    name: "Tăng view video",
    code: "VIEW_VIDEO",
    description: "Tăng lượt xem cho video Facebook",
    icon: "▶️",
    basePrice: 30000,
    unit: "1000",
    unitLabel: "lượt xem",
    minPrice: 10000,
    processingTime: 5,
    completionTime: 60,
    serviceType: "VIEW_VIDEO",
    requiredFields: ["post_url"],
    displayOrder: 15
  },
  {
    name: "Tăng view story",
    code: "VIEW_STORY",
    description: "Tăng lượt xem cho story Facebook",
    icon: "👁️",
    basePrice: 25000,
    unit: "1000",
    unitLabel: "lượt xem",
    minPrice: 5000,
    processingTime: 5,
    completionTime: 30,
    serviceType: "VIEW_STORY",
    requiredFields: ["story_url"],
    displayOrder: 16
  },
  {
    name: "Tăng view reels",
    code: "VIEW_REELS",
    description: "Tăng lượt xem cho reels Facebook",
    icon: "▶️",
    basePrice: 35000,
    unit: "1000",
    unitLabel: "lượt xem",
    minPrice: 10000,
    processingTime: 5,
    completionTime: 60,
    serviceType: "VIEW_REELS",
    requiredFields: ["reels_url"],
    displayOrder: 17
  }
];

const seedFacebookServices = async () => {
  try {
    // Xóa các dịch vụ cũ (optional - có thể comment nếu muốn giữ lại)
    // await FacebookService.deleteMany({});
    
    // Kiểm tra xem đã có dịch vụ chưa
    const existingCount = await FacebookService.countDocuments();
    if (existingCount > 0) {
      console.log(`Đã có ${existingCount} dịch vụ. Bỏ qua seed.`);
      return;
    }

    // Tạo các dịch vụ
    const services = await FacebookService.insertMany(facebookServices);
    console.log(`✅ Đã tạo ${services.length} dịch vụ buff Facebook`);
    return services;
  } catch (error) {
    console.error("❌ Lỗi khi seed dịch vụ Facebook:", error);
    throw error;
  }
};

module.exports = { seedFacebookServices, facebookServices };

