const BankQR = require("../models/bankQR");
const { BANKS } = require("../../config/banks");

// 🟢 Lấy tất cả Bank QR codes (Admin only)
const getAllBankQRs = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Chỉ admin mới được xem danh sách Bank QR code." });
    }

    // Lấy tất cả BankQR từ database
    const bankQRsFromDB = await BankQR.find().sort({ code: 1 });
    
    // Tạo map để tra cứu nhanh
    const dbMap = {};
    bankQRsFromDB.forEach(bq => {
      dbMap[bq.code] = bq;
    });

    // Merge với BANKS từ frontend, ưu tiên dữ liệu từ DB
    const allBankQRs = BANKS.map(bank => {
      const dbRecord = dbMap[bank.code];
      if (dbRecord) {
        // Có trong DB, dùng dữ liệu từ DB
        return {
          ...bank,
          _id: dbRecord._id,
          isVisible: dbRecord.isVisible,
          updatedBy: dbRecord.updatedBy,
          createdAt: dbRecord.createdAt,
          updatedAt: dbRecord.updatedAt
        };
      } else {
        // Chưa có trong DB, tạo mới với isVisible mặc định là true
        return {
          ...bank,
          isVisible: true
        };
      }
    }).filter(bank => bank.accountNo); // Chỉ lấy các bank có số tài khoản

    res.status(200).json(allBankQRs);
  } catch (error) {
    console.error("Error getting bank QR codes:", error);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách Bank QR code", error: error.message });
  }
};

// 🟢 Cập nhật trạng thái ẩn/hiện của Bank QR (Admin only)
const updateBankQRVisibility = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Chỉ admin mới được cập nhật Bank QR code." });
    }

    const { code } = req.params;
    const { isVisible } = req.body;

    if (typeof isVisible !== "boolean") {
      return res.status(400).json({ message: "isVisible phải là boolean (true/false)" });
    }

    // Tìm bank trong BANKS
    const bank = BANKS.find(b => b.code === code);
    if (!bank) {
      return res.status(404).json({ message: "Không tìm thấy ngân hàng với mã: " + code });
    }

    // Tìm hoặc tạo record trong DB
    let bankQR = await BankQR.findOne({ code });
    
    if (bankQR) {
      // Cập nhật
      bankQR.isVisible = isVisible;
      bankQR.updatedBy = req.user._id;
      await bankQR.save();
    } else {
      // Tạo mới
      bankQR = await BankQR.create({
        code: bank.code,
        name: bank.name,
        bin: bank.bin,
        accountNo: bank.accountNo,
        accountName: bank.accountName,
        isVisible: isVisible,
        updatedBy: req.user._id
      });
    }

    res.status(200).json({
      message: `Đã ${isVisible ? 'hiển thị' : 'ẩn'} QR code ${bank.name}`,
      bankQR
    });
  } catch (error) {
    console.error("Error updating bank QR visibility:", error);
    res.status(500).json({ message: "Lỗi server khi cập nhật Bank QR code", error: error.message });
  }
};

// 🟢 Lấy danh sách Bank QR đang hiển thị (Public - không cần auth)
const getVisibleBankQRs = async (req, res) => {
  try {
    // Lấy tất cả BankQR từ database
    const bankQRsFromDB = await BankQR.find().sort({ code: 1 });
    
    // Tạo map để tra cứu nhanh
    const dbMap = {};
    bankQRsFromDB.forEach(bq => {
      dbMap[bq.code] = bq;
    });

    // Merge với BANKS, chỉ lấy các bank có isVisible !== false
    const visibleBankQRs = BANKS
      .filter(bank => {
        const dbRecord = dbMap[bank.code];
        // Nếu có trong DB, dùng isVisible từ DB, nếu không có thì mặc định true
        const isVisible = dbRecord ? dbRecord.isVisible : true;
        return isVisible !== false && bank.accountNo; // Chỉ lấy các bank có số tài khoản và đang hiển thị
      })
      .map(bank => {
        const dbRecord = dbMap[bank.code];
        return {
          ...bank,
          isVisible: dbRecord ? dbRecord.isVisible : true
        };
      });

    res.status(200).json(visibleBankQRs);
  } catch (error) {
    console.error("Error getting visible bank QR codes:", error);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách Bank QR code", error: error.message });
  }
};

module.exports = {
  getAllBankQRs,
  updateBankQRVisibility,
  getVisibleBankQRs
};
