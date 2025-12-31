const BankFeed = require("../models/bankFeed");
const parse = require("./parseBankHistory");

// Relative to project root /data/nhap....json
// Hỗ trợ cả tên gốc có dấu và tên không dấu
const IN_FILES = [
  "nhập khoản_history.json",
  "nhap khoan_history.json",
  "nhap_khoan_history.json",
];
const OUT_FILES = [
  "xuất khoản_history.json",
  "xuat khoan_history.json",
  "xuat_khoan_history.json",
];

async function seedBankFeeds(force = false) {
  const count = await BankFeed.countDocuments();
  if (count && !force) {
    console.log(`🏦 BankFeed đã có ${count} bản ghi, bỏ qua seed.`);
    return;
  }
  if (force) await BankFeed.deleteMany({});

  const pickFirstReadable = (files, type) => {
    let lastErr;
    for (const f of files) {
      try {
        return parse(f, type);
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr;
  };

  const inArr = pickFirstReadable(IN_FILES, "in");
  const outArr = pickFirstReadable(OUT_FILES, "out");
  const all = [...inArr, ...outArr].sort((a, b) => b.createdAt - a.createdAt);

  await BankFeed.insertMany(all);
  console.log(`✅ Seed ${all.length} BankFeed thành công.`);
}

module.exports = seedBankFeeds;

