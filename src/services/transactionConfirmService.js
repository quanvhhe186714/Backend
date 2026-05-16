const Transaction = require("../models/transaction");
const Wallet = require("../models/wallet");

/**
 * Confirm a pending top-up transaction and credit wallet (idempotent if already success).
 */
const confirmTransactionSuccess = async (transaction, { provider, providerTransactionId } = {}) => {
  if (!transaction) {
    const error = new Error("Transaction not found");
    error.status = 404;
    throw error;
  }

  if (transaction.status === "success") {
    return { transaction, alreadyConfirmed: true };
  }

  if (transaction.status !== "pending") {
    const error = new Error(`Transaction is ${transaction.status}, cannot confirm`);
    error.status = 400;
    throw error;
  }

  if (providerTransactionId) {
    const duplicate = await Transaction.findOne({
      providerTransactionId,
      _id: { $ne: transaction._id },
    });
    if (duplicate) {
      const error = new Error("Webhook transaction already processed");
      error.status = 409;
      throw error;
    }
  }

  const wallet = await Wallet.findById(transaction.wallet);
  if (!wallet) {
    const error = new Error("Wallet not found");
    error.status = 400;
    throw error;
  }

  transaction.status = "success";
  transaction.confirmedAt = new Date();
  transaction.autoConfirmedAt = new Date();
  if (provider) transaction.provider = provider;
  if (providerTransactionId) transaction.providerTransactionId = providerTransactionId;
  await transaction.save();

  wallet.balance += transaction.amount;
  await wallet.save();

  return { transaction, alreadyConfirmed: false };
};

/**
 * Match pending transaction by transfer content (referenceCode) and amount.
 */
const findPendingTransactionByTransfer = async ({ description, amount }) => {
  if (!description || amount == null) return null;

  const normalizedDescription = String(description).toUpperCase();
  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) return null;

  const pending = await Transaction.find({ status: "pending" })
    .sort({ createdAt: -1 })
    .limit(200);

  for (const tx of pending) {
    const code = String(tx.referenceCode || "").toUpperCase();
    if (!code || !normalizedDescription.includes(code)) continue;
    if (Math.abs(tx.amount - amountNum) > 1) continue;
    return tx;
  }

  return null;
};

module.exports = {
  confirmTransactionSuccess,
  findPendingTransactionByTransfer,
};
