const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      trim: true,
      default: ""
    },
    isFake: {
      type: Boolean,
      default: false
    },
    createdAt: { type: Date, immutable: false },
    updatedAt: { type: Date }
  },
  { timestamps: true }
);

// Index for faster queries
ReviewSchema.index({ product: 1, createdAt: -1 });
ReviewSchema.index({ user: 1 });
ReviewSchema.index({ isFake: 1 });

module.exports = mongoose.model("Review", ReviewSchema);

