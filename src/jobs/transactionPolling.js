/**
 * Scheduled Job: Tự động kiểm tra các transaction pending
 * Chạy định kỳ để đảm bảo giao dịch được cập nhật ngay cả khi webhook không hoạt động
 */

const { checkPendingTransactions } = require("../services/sepayService");

let pollingInterval = null;
let isRunning = false;

/**
 * Khởi động polling job
 * @param {Number} intervalMinutes - Khoảng thời gian giữa các lần check (phút), mặc định 5 phút
 */
const startPolling = (intervalMinutes = 5) => {
  if (pollingInterval) {
    console.log("⚠️ Polling job đã đang chạy, bỏ qua khởi động lại");
    return;
  }

  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(`🔄 Khởi động transaction polling job (mỗi ${intervalMinutes} phút)`);

  // Chạy ngay lập tức lần đầu
  runCheck();

  // Sau đó chạy định kỳ
  pollingInterval = setInterval(() => {
    runCheck();
  }, intervalMs);
};

/**
 * Dừng polling job
 */
const stopPolling = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log("⏹️ Đã dừng transaction polling job");
  }
};

/**
 * Chạy kiểm tra một lần
 */
const runCheck = async () => {
  if (isRunning) {
    console.log("⏳ Polling job đang chạy, bỏ qua lần này");
    return;
  }

  try {
    isRunning = true;
    await checkPendingTransactions();
  } catch (error) {
    console.error("❌ Lỗi trong polling job:", error);
  } finally {
    isRunning = false;
  }
};

/**
 * Chạy kiểm tra thủ công (dùng cho testing hoặc API endpoint)
 */
const runManualCheck = async () => {
  console.log("🔍 Chạy kiểm tra thủ công...");
  return await checkPendingTransactions();
};

module.exports = {
  startPolling,
  stopPolling,
  runCheck,
  runManualCheck,
};

