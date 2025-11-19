const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    // price stored in VND
    price: { type: Number, required: true },
    duration_months: { type: Number, required: true }, // 1, 3, 6, 12
    features: [{ type: String }], // List of features: "4K Quality", "No Ads"
    image: { type: String, default: "" },
    currency: { type: String, default: "VND" },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);

