/**
 * Script kiểm tra transaction trong database
 * Chạy: node scripts/checkTransactions.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Transaction = require("../src/models/transaction");

async function checkTransactions() {
  try {
    // Kết nối MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Tìm tất cả transaction trong 24 giờ gần đây
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const transactions = await Transaction.find({
      createdAt: { $gte: oneDayAgo },
      isDeleted: { $ne: true },
    })
      .sort({ createdAt: -1 });

    console.log(`📋 Tìm thấy ${transactions.length} transaction trong 24 giờ gần đây:\n`);

    if (transactions.length === 0) {
      console.log("⚠️ KHÔNG CÓ transaction nào trong database!");
      console.log("💡 Có thể:");
      console.log("   1. Frontend chưa gọi API /wallet/topup để tạo transaction");
      console.log("   2. API bị lỗi khi tạo transaction");
      console.log("   3. Database connection có vấn đề\n");
    } else {
      transactions.forEach((tx, index) => {
        console.log(`${index + 1}. Transaction ID: ${tx._id}`);
        console.log(`   ReferenceCode: ${tx.referenceCode}`);
        console.log(`   Amount: ${tx.amount.toLocaleString('vi-VN')} VND`);
        console.log(`   Status: ${tx.status}`);
        console.log(`   CreatedAt: ${tx.createdAt}`);
        console.log(`   User ID: ${tx.user}`);
        console.log(`   Wallet ID: ${tx.wallet}`);
        console.log("");
      });

      // Thống kê
      const pendingCount = transactions.filter(tx => tx.status === "pending").length;
      const successCount = transactions.filter(tx => tx.status === "success").length;
      const failedCount = transactions.filter(tx => tx.status === "failed").length;

      console.log("📊 Thống kê:");
      console.log(`   Pending: ${pendingCount}`);
      console.log(`   Success: ${successCount}`);
      console.log(`   Failed: ${failedCount}\n`);
    }

    // Kiểm tra transaction pending gần đây nhất
    const recentPending = await Transaction.find({
      status: "pending",
      createdAt: { $gte: oneDayAgo },
      isDeleted: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .limit(5);

    if (recentPending.length > 0) {
      console.log("⏳ Các transaction PENDING gần đây nhất:");
      recentPending.forEach((tx, index) => {
        console.log(`   ${index + 1}. ${tx.referenceCode}: ${tx.amount.toLocaleString('vi-VN')} VND, createdAt: ${tx.createdAt}`);
      });
      console.log("");
    }

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkTransactions();

