const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
    code: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true,
      uppercase: true 
    },
    name: { 
      type: String, 
      required: true, 
      trim: true 
    },
    order: { 
      type: Number, 
      default: 0 
    },
    isActive: { 
      type: Boolean, 
      default: true 
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", CategorySchema);

