require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/users");
const Order = require("../models/order");
const Transaction = require("../models/transaction");

const EMAIL = "nvm149.10.2025@gmail.com";
const SEED_TAG = "TEST_SPEND_2026_04_20_30";

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("Missing MONGO_URI");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const user = await User.findOne({ email: EMAIL.toLowerCase() });
  if (!user) {
    throw new Error(`User not found: ${EMAIL}`);
  }

  const orderFilter = {
    user: user._id,
    "paymentDetails.seedTag": SEED_TAG,
  };
  const transactionFilter = {
    user: user._id,
    referenceCode: { $regex: `^${SEED_TAG}-` },
  };

  const orders = await Order.find(orderFilter).select("_id totalAmount createdAt status paymentDetails.seedRunId");
  const transactions = await Transaction.find(transactionFilter).select("_id amount referenceCode createdAt status");

  console.log(`Found ${orders.length} seeded orders and ${transactions.length} seeded transactions for ${EMAIL}`);
  orders.forEach((order) => {
    console.log(
      `ORDER ${order._id} ${order.status} ${order.totalAmount} ${order.createdAt?.toISOString?.().slice(0, 10)} run=${order.paymentDetails?.seedRunId || ""}`
    );
  });
  transactions.forEach((tx) => {
    console.log(
      `TX ${tx._id} ${tx.status} ${tx.amount} ${tx.referenceCode} ${tx.createdAt?.toISOString?.().slice(0, 10)}`
    );
  });

  const orderResult = await Order.deleteMany(orderFilter);
  const transactionResult = await Transaction.deleteMany(transactionFilter);

  console.log(`Deleted ${orderResult.deletedCount} seeded orders`);
  console.log(`Deleted ${transactionResult.deletedCount} seeded transactions`);

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error.message || error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
