require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/users");
const Wallet = require("../models/wallet");
const Order = require("../models/order");
const Transaction = require("../models/transaction");
const FacebookService = require("../services/facebook/models/facebookService");

const EMAIL = "nvm149.10.2025@gmail.com";
const SEED_TAG = "TEST_FACEBOOK_LINK_BUFF_2026_04";
const RUN_ID = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);

const links = [
  "https://www.facebook.com/permalink.php?story_fbid=pfbid02JYPtEgRAjDJazBpD7vbKmU6evkN4NRFvcnv7U8GmtdfY8dgEWWdgatFBiiwpvgg8l&id=61551788092818",
  "https://www.facebook.com/permalink.php?story_fbid=pfbid02Uh39Z4SQe9VnAX3dXir2QH73bMLiAwvKmt3gmhcivVxsKTVQUXhoTNAdPjjTEWDfl&id=61551788092818",
  "https://www.facebook.com/reel/1871329063757737",
  "https://www.facebook.com/reel/1342162940976439",
  "https://www.facebook.com/ismee09/posts/pfbid02yAJ3ZQ2mbA3vse6PFJw2cj1DqaHsJ7gt3UVqzu5HxcEuSMU32X9Xq6DoZs5KfVxWl",
  "https://www.facebook.com/ismee09/posts/pfbid0UxyzusXfch8fmhvPPg1cGo2qwvM1KtPWyf8Vd7Poc9tB1wXustjYhXSJDRV7oPqHl",
  "https://www.facebook.com/permalink.php?story_fbid=122270437136059603&id=61551788092818&substory_index=1465229111998491",
];

const pageUrl = "https://www.facebook.com/profile.php?id=61551788092818";
const amountPlan = [
  50000, 75000, 120000, 180000, 95000,
  200000, 65000, 140000, 110000, 85000,
  160000, 55000, 130000, 100000, 175000,
  70000, 150000, 60000, 125000, 90000,
  190000, 80000, 105000, 145000, 115000,
  170000, 50000, 155000, 135000, 200000,
];

const orderKinds = [
  { name: "Follow page", serviceTypes: ["FOLLOW", "LIKE_FANPAGE"], field: "fanpage_url", url: pageUrl },
  { name: "Like post", serviceTypes: ["LIKE_POST"], field: "post_url" },
  { name: "Share post", serviceTypes: ["SHARE_POST"], field: "post_url" },
  { name: "Comment post", serviceTypes: ["COMMENT"], field: "post_url" },
  { name: "View reels", serviceTypes: ["VIEW_REELS", "VIEW_VIDEO"], field: "reels_url" },
  { name: "Like reels", serviceTypes: ["LIKE_REELS", "LIKE_POST"], field: "reels_url" },
];

const statuses = ["paid", "delivered", "completed", "completed", "delivered"];

const dateForIndex = (index) => {
  const day = 20 + (index % 11);
  const hour = 9 + (index % 9);
  const minute = (index * 11) % 60;
  return new Date(Date.UTC(2026, 3, day, hour - 7, minute, 0));
};

const pickService = (services, kind, fallbackIndex) => {
  for (const type of kind.serviceTypes) {
    const service = services.find((item) => item.serviceType === type);
    if (service) return service;
  }
  return services[fallbackIndex % services.length];
};

const isReel = (url) => url.includes("/reel/");

const buildUrls = (service, kind, index) => {
  const sourceLink = kind.url || links[index % links.length];
  const primaryField = kind.field || service.requiredFields?.[0] || "post_url";
  const fields = service.requiredFields?.length ? service.requiredFields : [primaryField];
  const urls = {};

  fields.forEach((field) => {
    if (field === "fanpage_url") urls[field] = pageUrl;
    else if (field === "reels_url") urls[field] = isReel(sourceLink) ? sourceLink : links.find(isReel) || sourceLink;
    else urls[field] = sourceLink;
  });

  if (!urls[primaryField]) urls[primaryField] = sourceLink;
  return urls;
};

const makeQuantity = (amount, service) => {
  const unit = parseInt(service.unit, 10) || 1000;
  const unitPrice = service.basePrice || 10000;
  const raw = Math.max(unit, Math.round((amount / Math.max(unitPrice, 1)) * unit));
  return Math.ceil(raw / unit) * unit;
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

  const created = [];

  for (let index = 0; index < amountPlan.length; index += 1) {
    const kind = orderKinds[index % orderKinds.length];
    const service = pickService(services, kind, index);
    const amount = amountPlan[index];
    const createdAt = dateForIndex(index);
    const server = service.servers?.find((item) => item.status !== "inactive") || null;

    const order = await Order.create({
      user: user._id,
      items: [
        {
          serviceId: service._id,
          type: "service",
          name: `${kind.name} - ${service.name}`,
          price: amount,
          quantity: 1,
          serviceQuantity: makeQuantity(amount, service),
          serviceUnit: service.unit,
          serviceUnitLabel: service.unitLabel,
          serviceUrls: buildUrls(service, kind, index),
          serviceServer: server
            ? {
                serverId: server.serverId,
                name: server.name,
                description: server.description,
                price: server.price,
              }
            : null,
          serviceEmotion: "like",
          serviceType: "facebook_service",
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
        note: "Buff follow page/post/reel test data",
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

    const tx = await Transaction.create({
      user: user._id,
      wallet: wallet._id,
      amount: -amount,
      method: "wallet",
      bank: "wallet",
      referenceCode: `${SEED_TAG}-${RUN_ID}-${String(index + 1).padStart(2, "0")}`,
      note: `${kind.name} ${order._id.toString().slice(0, 8)}`,
      status: "success",
      confirmedAt: createdAt,
      createdAt,
      updatedAt: createdAt,
    });

    await Transaction.updateOne(
      { _id: tx._id },
      { $set: { createdAt, updatedAt: createdAt, confirmedAt: createdAt } },
      { timestamps: false }
    );

    created.push({ id: order._id.toString(), kind: kind.name, amount, status: statuses[index % statuses.length], createdAt });
  }

  const total = amountPlan.reduce((sum, value) => sum + value, 0);
  console.log(`Created ${created.length} facebook buff orders for ${EMAIL}`);
  console.log(`Seed tag: ${SEED_TAG}`);
  console.log(`Total spend: ${new Intl.NumberFormat("vi-VN").format(total)} VND`);
  created.forEach((order) => {
    console.log(
      `${order.createdAt.toISOString().slice(0, 10)} ${order.kind.padEnd(12)} ${order.status.padEnd(9)} ${new Intl.NumberFormat("vi-VN").format(order.amount)} VND ${order.id}`
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
