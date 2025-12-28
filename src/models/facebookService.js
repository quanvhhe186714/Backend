const mongoose = require("mongoose");

const FacebookServiceSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, 
      trim: true,
      unique: true 
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true
    },
    description: { 
      type: String, 
      required: true 
    },
    icon: {
      type: String,
      default: "👍"
    },
    // Giá theo đơn vị (ví dụ: giá cho 1000 likes)
    basePrice: { 
      type: Number, 
      required: true 
    },
    // Đơn vị tính (ví dụ: "1000 likes", "1000 views")
    unit: {
      type: String,
      default: "1000"
    },
    unitLabel: {
      type: String,
      default: "lượt"
    },
    // Giá tối thiểu
    minPrice: {
      type: Number,
      default: 0
    },
    // Giá tối đa
    maxPrice: {
      type: Number,
      default: null
    },
    // Thời gian xử lý (phút)
    processingTime: {
      type: Number,
      default: 5
    },
    // Thời gian hoàn thành (phút)
    completionTime: {
      type: Number,
      default: 60
    },
    // Loại dịch vụ
    serviceType: {
      type: String,
      enum: [
        "LIKE_POST",
        "LIKE_COMMENT", 
        "LIKE_FANPAGE",
        "LIKE_REELS",
        "FOLLOW",
        "COMMENT",
        "COMMENT_REELS",
        "SHARE_POST",
        "SHARE_GROUP",
        "SHARE_LIVESTREAM",
        "SHARE_REELS",
        "VIEW_STORY",
        "VIEW_VIDEO",
        "VIEW_REELS",
        "VIEW_LIVESTREAM",
        "RATE_FANPAGE",
        "MEMBER_GROUP"
      ],
      required: true
    },
    // Yêu cầu thông tin từ khách hàng
    requiredFields: [{
      type: String,
      enum: ["post_url", "fanpage_url", "group_url", "livestream_url", "reels_url", "story_url", "comment_url"]
    }],
    // Trạng thái
    isActive: { 
      type: Boolean, 
      default: true 
    },
    // Thứ tự hiển thị
    displayOrder: {
      type: Number,
      default: 0
    },
    // Trạng thái dịch vụ
    status: {
      type: String,
      enum: ["stable", "dropping", "slow", "maintenance"],
      default: "stable"
    },
    // Tỉ lệ tuột (%)
    dropRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    // Bảng giá mẫu với các mức số lượng
    priceTable: [{
      quantity: {
        type: Number,
        required: true
      },
      price: {
        type: Number,
        required: true
      }
    }],
    // Số ngày bảo hành
    warrantyDays: {
      type: Number,
      default: 30
    },
    // Số người đánh giá (null = tự động tính)
    totalReviewers: {
      type: Number,
      default: null
    }
  },
  { timestamps: true }
);

let FacebookServiceModel;
try {
  if (mongoose.models.FacebookService) {
    FacebookServiceModel = mongoose.models.FacebookService;
  } else {
    FacebookServiceModel = mongoose.model("FacebookService", FacebookServiceSchema);
  }
} catch (error) {
  FacebookServiceModel = mongoose.models.FacebookService;
}
module.exports = FacebookServiceModel;

