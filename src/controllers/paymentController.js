const { getContentFromData } = require("../utils/getContentFromData");
const Wallet = require("../models/wallet");
const Transaction = require("../models/transaction");

const BANK_CONFIGS = {
  vietin: {
    aliases: ["vietin", "vietinbank", "vtb"],
    bin: () => process.env.VIETIN_BANK_BIN || "970415",
    accountNo: () => process.env.VIETIN_BANK_ACCOUNT || "107876717017",
    accountName: () => process.env.VIETIN_BANK_ACCOUNT_NAME || "VU HONG QUAN",
    phone: () => process.env.VIETIN_BANK_PHONE || "",
  },
  hdbank: {
    aliases: ["hd", "hdbank", "hdb", "hd-bank"],
    bin: () => process.env.HD_BANK_BIN || "970437",
    accountNo: () => process.env.HD_BANK_ACCOUNT || "082704070007936",
    accountName: () => process.env.HD_BANK_ACCOUNT_NAME || "LE VAN HA",
    phone: () => process.env.HD_BANK_PHONE || "",
  },
  bidv_hieu: {
    aliases: ["bidv_hieu"],
    bin: () => process.env.BIDV_HIEU_BIN || "970418",
    accountNo: () => process.env.BIDV_HIEU_ACCOUNT || "8871752191",
    accountName: () => process.env.BIDV_HIEU_ACCOUNT_NAME || "VO MINH HIEU",
    phone: () => process.env.BIDV_HIEU_PHONE || "",
  },
  acb: {
    aliases: ["acb", "acbbank"],
    bin: () => process.env.ACB_BIN || "970416",
    accountNo: () => process.env.ACB_ACCOUNT || "570468",
    accountName: () => process.env.ACB_ACCOUNT_NAME || "NGUYEN THANH NHAN",
    phone: () => process.env.ACB_PHONE || "",
  },
  ocb_ca: {
    aliases: ["ocb_ca"],
    bin: () => process.env.OCB_CA_BIN || "970448",
    accountNo: () => process.env.OCB_CA_ACCOUNT || "0072100010",
    accountName: () => process.env.OCB_CA_ACCOUNT_NAME || "NGO VAN CA",
    phone: () => process.env.OCB_CA_PHONE || "",
  },
  ocb: {
    aliases: ["ocb"],
    bin: () => process.env.OCB_BIN || "970448",
    accountNo: () => process.env.OCB_ACCOUNT || "591635",
    accountName: () => process.env.OCB_ACCOUNT_NAME || "NGUYEN DOAN LUAN",
    phone: () => process.env.OCB_PHONE || "",
  },
  bidv: {
    aliases: ["bidv"],
    bin: () => process.env.BIDV_BANK_BIN || "970418",
    accountNo: () => process.env.BIDV_BANK_ACCOUNT || "8835915459",
    accountName: () => process.env.BIDV_BANK_ACCOUNT_NAME || "HONG CON BINH",
    phone: () => process.env.BIDV_BANK_PHONE || "",
  },
};

const resolveBank = (bank = "vietin") => {
  const requested = String(bank || "vietin").toLowerCase();
  const key =
    Object.keys(BANK_CONFIGS).find((name) =>
      BANK_CONFIGS[name].aliases.includes(requested)
    ) || "vietin";
  const config = BANK_CONFIGS[key];
  return {
    code: key,
    bin: config.bin(),
    accountNo: config.accountNo(),
    accountName: config.accountName(),
    phone: config.phone(),
  };
};

const buildVietQrImageUrl = ({ bin, accountNo, accountName, amount, content }) => {
  const base = `https://img.vietqr.io/image/${encodeURIComponent(bin)}-${encodeURIComponent(accountNo)}-compact2.png`;
  const params = new URLSearchParams();
  if (amount && Number(amount) > 0) params.set("amount", String(Math.floor(Number(amount))));
  if (content) params.set("addInfo", content);
  if (accountName) params.set("accountName", accountName);
  return `${base}?${params.toString()}`;
};

const ensureUniqueReferenceCode = async (baseCode) => {
  let referenceCode = String(baseCode || "").trim();
  if (!referenceCode) {
    referenceCode = `NAP${Date.now()}`;
  }

  const duplicated = await Transaction.findOne({ referenceCode });
  if (!duplicated) return referenceCode;

  return `${referenceCode}-${Date.now().toString().slice(-4)}`;
};

// GET /payments/qr?amount=100000&bank=vietin
// Creates a pending top-up transaction and returns a VietQR that contains the
// exact referenceCode used for webhook/manual confirmation.
const getVietQr = async (req, res) => {
  try {
    const { amount, content, bank = "vietin" } = req.query;
    const amountNum = Number(amount);

    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: "Vui long cung cap so tien hop le" });
    }

    const bankInfo = resolveBank(bank);
    if (!bankInfo.accountNo) {
      return res.status(400).json({
        message: "Bank account is not configured. Please set bank account in environment.",
      });
    }

    let transferContent = String(content || "").trim();
    let isContentFromData = false;
    if (!transferContent) {
      const contentFromData = getContentFromData(amountNum, "in", bankInfo.accountNo);
      if (contentFromData) {
        transferContent = contentFromData;
        isContentFromData = true;
      }
    }
    if (!transferContent) {
      transferContent = `NAP${Date.now()}`;
    }

    const referenceCode = await ensureUniqueReferenceCode(transferContent);
    const wallet =
      (await Wallet.findOne({ user: req.user._id })) ||
      (await Wallet.create({ user: req.user._id }));

    const transaction = await Transaction.create({
      user: req.user._id,
      wallet: wallet._id,
      amount: amountNum,
      method: "bank_transfer",
      bank: bankInfo.code,
      referenceCode,
      note: referenceCode,
      status: "pending",
    });

    const imageUrl = buildVietQrImageUrl({
      bin: bankInfo.bin,
      accountNo: bankInfo.accountNo,
      accountName: bankInfo.accountName,
      amount: amountNum,
      content: referenceCode,
    });

    return res.status(200).json({
      imageUrl,
      accountName: bankInfo.accountName || "",
      accountNo: bankInfo.accountNo || "",
      phone: bankInfo.phone || "",
      bank: bankInfo.code,
      amount: amountNum,
      content: referenceCode,
      referenceCode,
      isContentFromData,
      transactionId: transaction._id,
      status: transaction.status,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to generate QR", error: error.message });
  }
};

module.exports = { getVietQr };
