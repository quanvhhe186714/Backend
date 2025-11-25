const FacebookService = require("../models/facebookService");

const facebookServices = [
  {
    name: "Tăng like bài viết",
    code: "LIKE_POST",
    description: "Tăng lượt like cho bài viết Facebook của bạn",
    icon: "👍",
    basePrice: 50000,
    unit: "1000",
    unitLabel: "lượt like",
    minPrice: 10000,
    processingTime: 5,
    completionTime: 60,
    serviceType: "LIKE_POST",
    requiredFields: ["post_url"],
    displayOrder: 1,
    instructions: [
      "Vui lòng nhập đúng link bài viết và bật chế độ công khai trước khi mua.",
      "Đối với avatar hoặc ảnh bìa hãy ấn thẳng vào ảnh rồi mới copy link.",
      "Tăng like cho avatar hoặc ảnh bìa fb cá nhân cần bật nút like trước khi mua."
    ],
    servers: [
      {
        serverId: "1129",
        name: "Server 1129",
        description: "Chọn được một cảm xúc, tăng chậm, giá rẻ",
        price: 30,
        features: ["Chọn được một cảm xúc", "Tăng chậm", "Giá rẻ"],
        status: "active",
        supportsMultipleEmotions: false
      },
      {
        serverId: "1136",
        name: "Server 1136",
        description: "Like giá rẻ, chọn được một cảm xúc",
        price: 25,
        features: ["Like giá rẻ", "Chọn được một cảm xúc"],
        status: "active",
        supportsMultipleEmotions: false
      },
      {
        serverId: "1102",
        name: "Server 1102",
        description: "Chọn được nhiều cảm xúc, tăng chậm",
        price: 35,
        features: ["Chọn được nhiều cảm xúc", "Tăng chậm"],
        status: "active",
        supportsMultipleEmotions: true
      },
      {
        serverId: "1003",
        name: "Server 1003",
        description: "Chọn được một cảm xúc, tăng chậm",
        price: 50,
        features: ["Chọn được một cảm xúc", "Tăng chậm"],
        status: "active",
        supportsMultipleEmotions: false
      },
      {
        serverId: "1109",
        name: "Server 1109",
        description: "Chọn được nhiều cảm xúc, tăng chậm",
        price: 80,
        features: ["Chọn được nhiều cảm xúc", "Tăng chậm"],
        status: "active",
        supportsMultipleEmotions: true
      },
      {
        serverId: "147",
        name: "Server 147",
        description: "Chọn được nhiều cảm xúc, tăng chậm",
        price: 50,
        features: ["Chọn được nhiều cảm xúc", "Tăng chậm"],
        status: "active",
        supportsMultipleEmotions: true
      },
      {
        serverId: "148",
        name: "Server 148",
        description: "Chọn được nhiều cảm xúc, tăng chậm",
        price: 80,
        features: ["Chọn được nhiều cảm xúc", "Tăng chậm"],
        status: "active",
        supportsMultipleEmotions: true
      },
      {
        serverId: "1020",
        name: "Server 1020",
        description: "Chọn được nhiều cảm xúc, dự phòng",
        price: 90,
        features: ["Chọn được nhiều cảm xúc", "Dự phòng"],
        status: "backup",
        supportsMultipleEmotions: true
      },
      {
        serverId: "1022",
        name: "Server 1022",
        description: "Chọn được nhiều cảm xúc, dự phòng",
        price: 150,
        features: ["Chọn được nhiều cảm xúc", "Dự phòng"],
        status: "backup",
        supportsMultipleEmotions: true
      },
      {
        serverId: "1023",
        name: "Server 1023",
        description: "Chọn được nhiều cảm xúc, dự phòng",
        price: 300,
        features: ["Chọn được nhiều cảm xúc", "Dự phòng"],
        status: "backup",
        supportsMultipleEmotions: true
      },
      {
        serverId: "1041",
        name: "Server 1041",
        description: "Like quốc tế (like tây), tăng ổn",
        price: 350,
        features: ["Like quốc tế", "Like tây", "Tăng ổn"],
        status: "active",
        supportsMultipleEmotions: false
      }
    ]
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
    const existingCount = await FacebookService.countDocuments();
    if (existingCount > 0) {
      console.log(`Đã có ${existingCount} dịch vụ. Bỏ qua seed.`);
      return;
    }

    const services = await FacebookService.insertMany(facebookServices);
    console.log(`✅ Đã tạo ${services.length} dịch vụ buff Facebook`);
    return services;
  } catch (error) {
    console.error("❌ Lỗi khi seed dịch vụ Facebook:", error);
    throw error;
  }
};

module.exports = { seedFacebookServices, facebookServices };

