require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/users");
const Wallet = require("../models/wallet");
const Order = require("../models/order");
const Transaction = require("../models/transaction");
const FacebookService = require("../services/facebook/models/facebookService");

const EMAIL = "nvm149.10.2025@gmail.com";
const SEED_TAG = "FACEBOOK_LINK_BUFF_NVM149_2026_04_29_30";
const RUN_ID = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);

const allLinks = [
  "https://www.facebook.com/reel/2004237240180249?locale=vi_VN",
  "https://www.facebook.com/photo?fbid=938583779163573&set=pcb.938584902496794&locale=vi_VN",
  "https://www.facebook.com/photo/?fbid=812103255276147&set=pcb.812104555276017",
  "https://www.facebook.com/reel/951258480882882",
  "https://www.facebook.com/photo/?fbid=938850602470224&set=a.254426120912679",
  "https://www.facebook.com/permalink.php?story_fbid=pfbid08FzyeNMCB2rAy2PkfuJ8jXATNqZ7WnzcnSHww4Tj1tBQgNcZPYTQ5ZvX1aUXwZpal&id=61551788092818",
];

const reelLinks = allLinks.filter((url) => url.includes("/reel/"));
const postLinks = allLinks;

const amountPlan = [
  155000, 205000, 175000, 230000, 125000,
  190000, 245000, 85000, 165000, 215000,
  140000, 250000, 95000, 185000, 225000,
  150000, 200000, 120000, 235000, 175000,
  90000, 210000, 160000, 240000, 130000,
  195000, 250000, 110000, 180000, 220000,
];

const localDate = (value) => new Date(`${value}+07:00`);
const createdAtPlan = [
  "2026-04-29T08:07:00",
  "2026-04-29T08:46:00",
  "2026-04-29T09:28:00",
  "2026-04-29T10:17:00",
  "2026-04-29T11:06:00",
  "2026-04-29T12:14:00",
  "2026-04-29T13:22:00",
  "2026-04-29T14:31:00",
  "2026-04-29T15:43:00",
  "2026-04-29T16:56:00",
  "2026-04-29T18:08:00",
  "2026-04-29T19:19:00",
  "2026-04-29T20:37:00",
  "2026-04-29T21:54:00",
  "2026-04-29T23:23:00",
  "2026-04-30T11:05:00",
  "2026-04-30T11:49:00",
  "2026-04-30T12:32:00",
  "2026-04-30T13:18:00",
  "2026-04-30T14:06:00",
  "2026-04-30T14:55:00",
  "2026-04-30T15:47:00",
  "2026-04-30T16:39:00",
  "2026-04-30T17:28:00",
  "2026-04-30T18:21:00",
  "2026-04-30T19:17:00",
  "2026-04-30T20:06:00",
  "2026-04-30T20:58:00",
  "2026-04-30T21:49:00",
  "2026-04-30T22:58:00",
].map(localDate);

const statuses = ["paid", "delivered", "completed", "delivered", "completed"];

const linkPoolForService = (service) => {
  const fields = service.requiredFields?.length ? service.requiredFields : ["post_url"];
  if (fields.includes("fanpage_url")) return [];
  if (fields.includes("reels_url")) return reelLinks;
  return postLinks;
};

const buildUrls = (service, link) => {
  const fields = service.requiredFields?.length ? service.requiredFields : ["post_url"];
  const urls = {};

  fields.forEach((field) => {
    if (field === "reels_url") urls[field] = link.includes("/reel/") ? link : reelLinks[0];
    else urls[field] = link;
  });

  return urls;
};

const makeQuantity = (amount, service) => {
  const unit = parseInt(service.unit, 10) || 1000;
  const unitPrice = service.basePrice || 10000;
  const raw = Math.max(unit, Math.round((amount / Math.max(unitPrice, 1)) * unit));
  return Math.ceil(raw / unit) * unit;
};

const buildPlan = (services) => {
  const candidates = services
    .map((service) => ({ service, links: linkPoolForService(service) }))
    .filter((candidate) => candidate.links.length > 0);

  const capacity = candidates.reduce((sum, candidate) => sum + candidate.links.length, 0);
  if (capacity < amountPlan.length) {
    throw new Error(`Not enough unique service/link pairs. Need ${amountPlan.length}, found ${capacity}.`);
  }

  const usedLinksByService = new Map();
  const plan = [];
  let cursor = 0;

  while (plan.length < amountPlan.length) {
    const candidate = candidates[cursor % candidates.length];
    const serviceKey = candidate.service._id.toString();
    const usedLinks = usedLinksByService.get(serviceKey) || new Set();
    const link = candidate.links.find((item) => !usedLinks.has(item));

    if (link) {
      usedLinks.add(link);
      usedLinksByService.set(serviceKey, usedLinks);
      plan.push({ service: candidate.service, link });
    }

    cursor += 1;
    if (cursor > candidates.length * allLinks.length * 3 && plan.length < amountPlan.length) {
      throw new Error("Unable to build a no-duplicate link plan for the current active services.");
    }
  }

  return plan;
};

const getServer = (service) => {
  const server = service.servers?.find((item) => item.status !== "inactive") || null;
  if (!server) return null;
  return {
    serverId: server.serverId,
    name: server.name,
    description: server.description,
    price: server.price,
  };
};

const buildOrderItem = (planItem, amount) => {
  const service = planItem.service;
  return {
    serviceId: service._id,
    type: "service",
    name: service.name,
    price: amount,
    quantity: 1,
    serviceQuantity: makeQuantity(amount, service),
    serviceUnit: service.unit,
    serviceUnitLabel: service.unitLabel,
    serviceUrls: buildUrls(service, planItem.link),
    serviceServer: getServer(service),
    serviceEmotion: "like",
    serviceType: "facebook_service",
  };
};

const run = async () => {
  if (!process.env.MONGO_URI) throw new Error("Missing MONGO_URI");
  await mongoose.connect(process.env.MONGO_URI);

  const user = await User.findOne({ email: EMAIL.toLowerCase() });
  if (!user) throw new Error(`User not found: ${EMAIL}`);

  let wallet = await Wallet.findOne({ user: user._id });
  if (!wallet) wallet = await Wallet.create({ user: user._id });

  const services = await FacebookService.find({
    isActive: true,
    platform: "facebook",
  }).sort({ displayOrder: 1, name: 1 });

  if (!services.length) throw new Error("No active facebook services found");

  const plan = buildPlan(services);
  const orders = await Order.find({
    user: user._id,
    "paymentDetails.seedTag": SEED_TAG,
  }).sort({ createdAt: 1, _id: 1 });

  if (orders.length > amountPlan.length) {
    throw new Error(`Found ${orders.length} existing seeded orders, expected at most ${amountPlan.length}. No updates applied.`);
  }

  const changed = [];

  for (let index = 0; index < amountPlan.length; index += 1) {
    const amount = amountPlan[index];
    const createdAt = createdAtPlan[index];
    const orderNo = String(index + 1).padStart(2, "0");
    const item = buildOrderItem(plan[index], amount);

    if (orders[index]) {
      await Order.updateOne(
        { _id: orders[index]._id },
        {
          $set: {
            items: [item],
            subTotal: amount,
            discountAmount: 0,
            totalAmount: amount,
            paymentMethod: "wallet",
            paymentDetails: {
              seedTag: SEED_TAG,
              seedRunId: orders[index].paymentDetails?.seedRunId || RUN_ID,
              telegramUsername: "nvm149",
              note: "Buff Facebook link 29/4-30/4, no duplicate link per service",
            },
            status: statuses[index % statuses.length],
            walletCharged: true,
            createdAt,
            updatedAt: createdAt,
          },
        },
        { timestamps: false }
      );

      const referenceCode = new RegExp(`^${SEED_TAG}-\\d{14}-${orderNo}$`);
      await Transaction.updateOne(
        { user: user._id, referenceCode },
        {
          $set: {
            wallet: wallet._id,
            amount: -amount,
            method: "wallet",
            bank: "wallet",
            note: `${item.name} ${orders[index]._id.toString().slice(0, 8)}`,
            status: "success",
            confirmedAt: createdAt,
            createdAt,
            updatedAt: createdAt,
          },
        },
        { timestamps: false }
      );

      changed.push({ action: "updated", id: orders[index]._id.toString(), amount, createdAt, service: item.name, link: plan[index].link });
      continue;
    }

    const order = await Order.create({
      user: user._id,
      items: [item],
      subTotal: amount,
      discountAmount: 0,
      totalAmount: amount,
      paymentMethod: "wallet",
      paymentDetails: {
        seedTag: SEED_TAG,
        seedRunId: RUN_ID,
        telegramUsername: "nvm149",
        note: "Buff Facebook link 29/4-30/4, no duplicate link per service",
      },
      status: statuses[index % statuses.length],
      walletCharged: true,
      createdAt,
      updatedAt: createdAt,
    });

    await Order.updateOne(
      { _id: order._id },
      { $set: { createdAt, updatedAt: createdAt } },
      { timestamps: false }
    );

    await Transaction.create({
      user: user._id,
      wallet: wallet._id,
      amount: -amount,
      method: "wallet",
      bank: "wallet",
      referenceCode: `${SEED_TAG}-${RUN_ID}-${orderNo}`,
      note: `${item.name} ${order._id.toString().slice(0, 8)}`,
      status: "success",
      confirmedAt: createdAt,
      createdAt,
      updatedAt: createdAt,
    });

    changed.push({ action: "created", id: order._id.toString(), amount, createdAt, service: item.name, link: plan[index].link });
  }

  const total = amountPlan.reduce((sum, amount) => sum + amount, 0);
  console.log(`Prepared ${changed.length} facebook buff orders for ${EMAIL}`);
  console.log(`Updated existing: ${changed.filter((item) => item.action === "updated").length}`);
  console.log(`Created new: ${changed.filter((item) => item.action === "created").length}`);
  console.log(`Seed tag: ${SEED_TAG}`);
  console.log(`Total spend: ${new Intl.NumberFormat("vi-VN").format(total)} VND`);
  changed.forEach((item, index) => {
    console.log(
      `${String(index + 1).padStart(2, "0")} ${item.action.padEnd(7)} ${item.createdAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} ${new Intl.NumberFormat("vi-VN").format(item.amount)} VND ${item.service} ${item.id}`
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
