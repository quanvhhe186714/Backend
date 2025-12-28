const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: false
    },
    facebookService: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FacebookService",
      required: false
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

// Validation: either product or facebookService must be provided
ReviewSchema.pre('validate', function(next) {
  if (!this.product && !this.facebookService) {
    this.invalidate('product', 'Either product or facebookService must be provided');
    this.invalidate('facebookService', 'Either product or facebookService must be provided');
  }
  if (this.product && this.facebookService) {
    this.invalidate('product', 'Cannot have both product and facebookService');
    this.invalidate('facebookService', 'Cannot have both product and facebookService');
  }
  next();
});

// Index for faster queries
ReviewSchema.index({ product: 1, createdAt: -1 });
ReviewSchema.index({ facebookService: 1, createdAt: -1 });
ReviewSchema.index({ user: 1 });
ReviewSchema.index({ isFake: 1 });

module.exports = mongoose.model("Review", ReviewSchema);

