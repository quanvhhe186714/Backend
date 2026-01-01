const fs = require("fs");
const path = require("path");

/**
 * Tìm nội dung chuyển khoản từ file JSON dựa trên số tiền
 * @param {number} amount - Số tiền cần tìm (ví dụ: 500000 cho 500k)
 * @param {string} type - Loại file: "in" (nhập khoản) hoặc "out" (xuất khoản), mặc định là "in"
 * @returns {string|null} - Nội dung chuyển khoản nếu tìm thấy, null nếu không tìm thấy
 */
const getContentFromData = (amount, type = "in") => {
  try {
    // Xác định file path dựa trên type
    const fileName = type === "in" ? "nhập khoản_history.json" : "xuất khoản_history.json";
    const filePath = path.join(__dirname, "../../data", fileName);

    // Kiểm tra file có tồn tại không
    if (!fs.existsSync(filePath)) {
      console.warn(`File ${fileName} không tồn tại`);
      return null;
    }

    // Đọc file JSON
    const fileContent = fs.readFileSync(filePath, "utf8");
    const transactions = JSON.parse(fileContent);

    // Tìm transaction có số tiền khớp chính xác
    const matchingTransaction = transactions.find(
      (transaction) => transaction.so_tien === amount
    );

    if (matchingTransaction && matchingTransaction.noi_dung) {
      return matchingTransaction.noi_dung;
    }

    // Nếu không tìm thấy khớp chính xác, tìm gần nhất (sai số ±1000 VND)
    const tolerance = 1000;
    const nearMatch = transactions.find(
      (transaction) =>
        Math.abs(transaction.so_tien - amount) <= tolerance
    );

    if (nearMatch && nearMatch.noi_dung) {
      console.log(
        `Tìm thấy nội dung gần khớp: ${nearMatch.so_tien} (chênh lệch: ${Math.abs(nearMatch.so_tien - amount)})`
      );
      return nearMatch.noi_dung;
    }

    return null;
  } catch (error) {
    console.error("Lỗi khi đọc file JSON:", error);
    return null;
  }
};

/**
 * Tìm nội dung từ cả 2 file (nhập và xuất khoản)
 * Ưu tiên file nhập khoản trước
 * @param {number} amount - Số tiền cần tìm
 * @returns {string|null} - Nội dung chuyển khoản nếu tìm thấy
 */
const getContentFromAnyData = (amount) => {
  // Thử tìm trong file nhập khoản trước
  const contentFromIn = getContentFromData(amount, "in");
  if (contentFromIn) {
    return contentFromIn;
  }

  // Nếu không tìm thấy, thử file xuất khoản
  const contentFromOut = getContentFromData(amount, "out");
  if (contentFromOut) {
    return contentFromOut;
  }

  return null;
};

module.exports = {
  getContentFromData,
  getContentFromAnyData,
};

