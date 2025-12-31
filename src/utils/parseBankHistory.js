const fs = require("fs");
const path = require("path");

/**
 * Đọc file JSON lịch sử BIDV và chuẩn hoá.
 * @param {string} filePath Đường dẫn tới file json
 * @param {"in"|"out"} type Loại giao dịch
 * @returns {Array<{type:string,amount:number,note:string,createdAt:Date}>}
 */
function parseBankHistory(filePath, type = "in") {
  const abs = path.isAbsolute(filePath)
    ? filePath
    : path.join(__dirname, "../../data", filePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`Không tìm thấy file: ${abs}`);
  }
  const raw = fs.readFileSync(abs, "utf8");
  const arr = JSON.parse(raw);
  return arr.map((item) => ({
    type,
    amount: type === "in" ? Number(item.so_tien) : -Math.abs(Number(item.so_tien)),
    note: item.noi_dung || "",
    createdAt: new Date(item.createdAt),
  }));
}

module.exports = parseBankHistory;

