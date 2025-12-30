/**
 * Script test SePay API với API Token
 * Test các API endpoint của SePay
 * 
 * Chạy: node scripts/testSePayAPI.js
 */

require("dotenv").config();
const axios = require("axios");

// Cấu hình
const SEPAY_API_TOKEN = process.env.SEPAY_API_TOKEN;
const SEPAY_BASE_URL = "https://my.sepay.vn/userapi";

// Màu sắc cho console
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Test 1: Lấy danh sách giao dịch
 */
async function testGetTransactions() {
  log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "cyan");
  log("🧪 TEST 1: Lấy danh sách giao dịch", "bright");
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n", "cyan");

  try {
    const response = await axios.get(`${SEPAY_BASE_URL}/transactions/list`, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SEPAY_API_TOKEN}`,
      },
      params: {
        page: 1,
        limit: 10,
      },
    });

    log("✅ Response:", "green");
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    log("\n❌ Error:", "red");
    if (error.response) {
      console.log("Status:", error.response.status);
      console.log("Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.log(error.message);
    }
    return null;
  }
}

/**
 * Test 2: Lấy thông tin tài khoản
 */
async function testGetAccountInfo() {
  log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "cyan");
  log("🧪 TEST 2: Lấy thông tin tài khoản", "bright");
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n", "cyan");

  try {
    const response = await axios.get(`${SEPAY_BASE_URL}/account/info`, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SEPAY_API_TOKEN}`,
      },
    });

    log("✅ Response:", "green");
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    log("\n❌ Error:", "red");
    if (error.response) {
      console.log("Status:", error.response.status);
      console.log("Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.log(error.message);
    }
    return null;
  }
}

/**
 * Test 3: Kiểm tra API Token
 */
async function testAPIToken() {
  log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "cyan");
  log("🧪 TEST 3: Kiểm tra API Token", "bright");
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n", "cyan");

  if (!SEPAY_API_TOKEN) {
    log("❌ SEPAY_API_TOKEN chưa được cấu hình trong .env", "red");
    log("   Vui lòng thêm: SEPAY_API_TOKEN=your_token_here", "yellow");
    return null;
  }

  log(`✅ API Token: ${SEPAY_API_TOKEN.substring(0, 20)}...`, "green");
  log(`   Độ dài: ${SEPAY_API_TOKEN.length} ký tự\n`, "green");

  // Test với endpoint đơn giản
  try {
    const response = await axios.get(`${SEPAY_BASE_URL}/account/info`, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SEPAY_API_TOKEN}`,
      },
    });

    log("✅ API Token hợp lệ!", "green");
    return true;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      log("❌ API Token không hợp lệ hoặc đã hết hạn", "red");
    } else {
      log("⚠️  Không thể xác thực API Token", "yellow");
      console.log("Error:", error.message);
    }
    return false;
  }
}

/**
 * Chạy tất cả các test
 */
async function runAllTests() {
  log("\n╔══════════════════════════════════════════════════════════════╗", "bright");
  log("║           TEST SEPAY API VỚI API TOKEN                       ║", "bright");
  log("╚══════════════════════════════════════════════════════════════╝\n", "bright");

  log(`🌐 SePay API Base URL: ${SEPAY_BASE_URL}`, "cyan");
  
  if (!SEPAY_API_TOKEN) {
    log("\n❌ SEPAY_API_TOKEN chưa được cấu hình!", "red");
    log("\n📝 Cách cấu hình:", "yellow");
    log("   1. Mở file .env", "yellow");
    log("   2. Thêm dòng: SEPAY_API_TOKEN=your_api_token_here", "yellow");
    log("   3. Lưu file và chạy lại script này\n", "yellow");
    return;
  }

  log(`🔑 API Token: ${SEPAY_API_TOKEN.substring(0, 30)}...\n`, "cyan");

  // Chạy các test
  const tokenValid = await testAPIToken();
  
  if (tokenValid) {
    await testGetAccountInfo();
    await testGetTransactions();
  } else {
    log("\n⚠️  Vui lòng kiểm tra lại API Token trong file .env", "yellow");
  }

  log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "cyan");
  log("✅ Hoàn thành tất cả các test!", "green");
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n", "cyan");
}

// Chạy script
if (require.main === module) {
  runAllTests().catch((error) => {
    log("\n❌ Lỗi khi chạy test:", "red");
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  testGetTransactions,
  testGetAccountInfo,
  testAPIToken,
  runAllTests,
};

