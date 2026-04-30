require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/users");
const Wallet = require("../models/wallet");
const Order = require("../models/order");
const Transaction = require("../models/transaction");
const FacebookService = require("../services/facebook/models/facebookService");

const EMAIL = "nvm149.10.2025@gmail.com";
const SEED_TAG = "TEST_SPEND_2026_04_20_30";
const RUN_ID = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const ORDER_COUNT = 20;

const amountPlan = [
  50000, 80000, 120000, 65000, 200000,
  90000, 150000, 110000, 70000, 180000,
  95000, 130000, 55000, 175000, 100000,
  85000, 160000, 60000, 140000, 125000,
];

const statusPlan = [
  "completed", "delivered", "completed", "paid", "completed",
  "delivered", "completed", "completed", "paid", "delivered",
  "completed", "completed", "delivered", "completed", "paid",
  "completed", "delivered", "completed", "completed", "delivered",
];

const serviceUrlByField = {
  post_url: "https://www.facebook.com/shopnambs/posts/seed",
  fanpage_url: "https://www.facebook.com/shopnambs",
  group_url: "https://www.facebook.com/groups/shopnambs",
  livestream_url: "https://www.facebook.com/watch/live/?v=149202604",
  reels_url: "https://www.facebook.com/reel/149202604",
  story_url: "https://www.facebook.com/stories/149202604",
  comment_url: "https://www.facebook.com/shopnambs/posts/seed?comment_id=149202604",
};

const dateForIndex = (index) => {
  const day = 20 + Math.floor(index / 2);
  const hour = index % 2 === 0 ? 10 : 15;
  const minute = (index * 7) % 60;
  return new Date(Date.UTC(2026, 3, day, hour - 7, minute, 0));
};

const buildUrls = (requiredFields, platform, index) => {
  const fields = requiredFields?.length ? requiredFields : ["post_url"];
  const urls = {};
  fields.forEach((field) => {
    const base = serviceUrlByField[field] || serviceUrlByField.post_url;
    urls[field] = `${base}-${platform}-${index + 1}`;
  });
  return urls;
};

const makeQuantity = (amount, unitPrice, unit) => {
  const safeUnit = parseInt(unit, 10) || 1000;
  const raw = Math.max(safeUnit, Math.round((amount / Math.max(unitPrice, 1)) * safeUnit));
  return Math.ceil(raw / safeUnit) * safeUnit;
};

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("Missing MONGO_URI");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const user = await User.findOne({ email: EMAIL.toLowerCase() });
  if (!user) {
    throw new Error(`User not found: ${EMAIL}`);
  }

  let wallet = await Wallet.findOne({ user: user._id });
  if (!wallet) {
    wallet = await Wallet.create({ user: user._id });
  }

  const services = await FacebookService.find({
    isActive: true,
    platform: { $in: ["facebook", "tiktok"] },
  }).sort({ platform: 1, displayOrder: 1, name: 1 });

  const facebookServices = services.filter((service) => service.platform === "facebook");
  const tiktokServices = services.filter((service) => service.platform === "tiktok");

  if (!facebookServices.length || !tiktokServices.length) {
    throw new Error("Need at least one active facebook service and one active tiktok service");
  }

  const createdOrders = [];

  for (let index = 0; index < ORDER_COUNT; index += 1) {
    const platform = index % 2 === 0 ? "facebook" : "tiktok";
    const servicePool = platform === "facebook" ? facebookServices : tiktokServices;
    const service = servicePool[index % servicePool.length];
    const amount = amountPlan[index];
    const createdAt = dateForIndex(index);
    const unit = parseInt(service.unit, 10) || 1000;
    const unitPrice = service.basePrice || 10000;
    const serviceQuantity = makeQuantity(amount, unitPrice, unit);
    const server = service.servers?.find((item) => item.status !== "inactive") || null;

    const order = await Order.create({
      user: user._id,
      items: [
        {
          serviceId: service._id,
          type: "service",
          name: service.name,
          price: amount,
          quantity: 1,
          serviceQuantity,
          serviceUnit: service.unit,
          serviceUnitLabel: service.unitLabel,
          serviceUrls: buildUrls(service.requiredFields, platform, index),
          serviceServer: server
            ? {
                serverId: server.serverId,
                name: server.name,
                description: server.description,
                price: server.price,
              }
            : null,
          serviceEmotion: platform === "facebook" ? "like" : "",
          serviceType: `${platform}_service`,
        },
      ],
      subTotal: amount,
      discountAmount: 0,
      totalAmount: amount,
      paymentMethod: "wallet",
      paymentDetails: {
        seedTag: SEED_TAG,
        seedRunId: RUN_ID,
        telegramUsername: "nvm149",
        platform,
      },
      status: statusPlan[index],
      walletCharged: true,
      createdAt,
      updatedAt: createdAt,
    });

    await Order.updateOne(
      { _id: order._id },
      { $set: { createdAt, updatedAt: createdAt } },
      { timestamps: false }
    );

    const transaction = await Transaction.create({
      user: user._id,
      wallet: wallet._id,
      amount: -amount,
      method: "wallet",
      bank: "wallet",
      referenceCode: `${SEED_TAG}-${RUN_ID}-${String(index + 1).padStart(2, "0")}`,
      note: `Test spend ${platform} order ${order._id.toString().slice(0, 8)}`,
      status: "success",
      confirmedAt: createdAt,
      createdAt,
      updatedAt: createdAt,
    });

    await Transaction.updateOne(
      { _id: transaction._id },
      { $set: { createdAt, updatedAt: createdAt, confirmedAt: createdAt } },
      { timestamps: false }
    );

    createdOrders.push({ id: order._id.toString(), platform, amount, status: statusPlan[index], createdAt });
  }

  const total = amountPlan.reduce((sum, value) => sum + value, 0);
  console.log(`Created ${createdOrders.length} service orders for ${EMAIL}`);
  console.log(`Date range: 2026-04-20 to 2026-04-30`);
  console.log(`Total spend: ${new Intl.NumberFormat("vi-VN").format(total)} VND`);
  createdOrders.forEach((order) => {
    console.log(
      `${order.createdAt.toISOString().slice(0, 10)} ${order.platform.padEnd(8)} ${order.status.padEnd(9)} ${new Intl.NumberFormat("vi-VN").format(order.amount)} VND ${order.id}`
    );
  });

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error.message || error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
