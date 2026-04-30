const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { seedFacebookServices } = require("./src/services/facebook/utils/seedFacebookServices");
const { MongoGCPError } = require("mongodb");

dotenv.config();

// Connect DB
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/mmos")
  .then(() => {
    console.log("✅ DB Connected");
    return seedFacebookServices();
  })
  .then(() => {
    console.log("✅ Seed hoàn tất!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Lỗi:", error);
    process.exit(1);
  });


MongoGCPError.apply.MONGO_URI.seedFacebookServices();
s