const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../src/models/users");
const Order = require("../src/models/order");
const FacebookService = require("../src/models/facebookService");

dotenv.config();

const EMAIL = "yakin2arr88@gmail.com";
const TARGET_TOTAL = 950000;
const MIN_ORDERS = 6;
const MAX_ORDERS = 8;
const MIN_AMOUNT = 50000;
const MAX_AMOUNT = 200000;
const START_DATE = new Date("2026-04-23T09:00:00+07:00");
const END_DATE = new Date("2026-05-06T22:00:00+07:00");

const facebookOrderPlan = [
  {
    serviceType: "LIKE_POST",
    namePattern: /like.*(bai|post)|tang like/i,
    fallbackName: "Tang like bai viet Facebook",
    field: "post_url",
    url: "https://www.facebook.com/share/p/1ECcFrG5am/",
  },
  {
    serviceType: "FOLLOW",
    namePattern: /follow|theo doi|sub/i,
    fallbackName: "Tang follow fanpage Facebook",
    field: "fanpage_url",
    url: "https://www.facebook.com/cobasaigonkeothue",
  },
  {
    serviceType: "SHARE_POST",
    namePattern: /share.*(bai|post)|chia se/i,
    fallbackName: "Buff share bai viet Facebook",
    field: "post_url",
    url: "https://www.facebook.com/share/18YSGwhMMQ/",
  },
  {
    serviceType: "LIKE_POST",
    namePattern: /like.*(bai|post)|tang like/i,
    fallbackName: "Buff like bai viet Facebook",
    field: "post_url",
    url: "https://www.facebook.com/share/p/1BBikJNo6k/",
  },
  {
    serviceType: "LIKE_FANPAGE",
    namePattern: /like.*fanpage|fanpage/i,
    fallbackName: "Buff like fanpage Facebook",
    field: "fanpage_url",
    url: "https://www.facebook.com/cobasaigonkeothue",
  },
  {
    serviceType: "LIKE_COMMENT",
    namePattern: /like.*comment|comment/i,
    fallbackName: "Tang like comment Facebook",
    field: "comment_url",
    url: "https://www.facebook.com/share/p/1NqCobaSaiGon01/",
  },
  {
    serviceType: "VIEW_VIDEO",
    namePattern: /view|xem|reels|video/i,
    fallbackName: "Tang view video Facebook",
    field: "post_url",
    url: "https://www.facebook.com/share/p/1NqCobaSaiGon02/",
  },
  {
    serviceType: "COMMENT",
    namePattern: /comment|binh luan/i,
    fallbackName: "Buff comment bai viet Facebook",
    field: "post_url",
    url: "https://www.facebook.com/share/p/1NqCobaSaiGon03/",
  },
];

const statuses = ["completed", "delivered", "paid"];
const apply = process.argv.includes("--apply");

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const roundTo = (value, step) => Math.round(value / step) * step;

const normalize = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const makeAmounts = () => {
  const count = randomInt(MIN_ORDERS, MAX_ORDERS);
  const amounts = Array.from({ length: count }, () => randomInt(MIN_AMOUNT, MAX_AMOUNT));
  const currentTotal = amounts.reduce((sum, amount) => sum + amount, 0);
  let diff = TARGET_TOTAL - currentTotal;

  for (let i = 0; i < amounts.length && Math.abs(diff) > 0; i += 1) {
    const room = diff > 0 ? MAX_AMOUNT - amounts[i] : amounts[i] - MIN_AMOUNT;
    const delta = Math.min(Math.abs(diff), room);
    amounts[i] += diff > 0 ? delta : -delta;
    diff += diff > 0 ? -delta : delta;
  }

  return amounts.map((amount) => roundTo(amount, 1000));
};

const makeDate = (index, total) => {
  const start = START_DATE.getTime();
  const end = END_DATE.getTime();
  const ratio = total <= 1 ? 0 : index / (total - 1);
  const jitter = randomInt(-4, 4) * 60 * 60 * 1000;
  const time = Math.min(Math.max(start + (end - start) * ratio + jitter, start), end);
  const date = new Date(time);
  date.setMinutes(randomInt(0, 59), randomInt(0, 59), 0);
  return date;
};

const findMatchingService = (services, spec) => {
  const byType = services.find((service) => service.serviceType === spec.serviceType);
  if (byType) return byType;

  return services.find((service) => spec.namePattern.test(normalize(service.name)));
};

const buildOrder = (user, service, spec, amount, index, total) => {
  const unit = Number(service?.unit) || 1000;
  const basePrice = service?.basePrice || amount;
  const pricePerUnit = Math.max(1, Math.ceil(basePrice / (unit / 1000)));
  const serviceQuantity = Math.max(100, Math.round((amount / pricePerUnit) * 1000));
  const createdAt = makeDate(index, total);

  return {
    user: user._id,
    items: [
      {
        serviceId: service?._id,
        type: "service",
        name: service?.name || spec.fallbackName,
        price: amount,
        quantity: 1,
        serviceQuantity,
        serviceUnit: String(unit),
        serviceUnitLabel: service?.unitLabel || "luot",
        serviceUrls: {
          [spec.field]: spec.url,
        },
        serviceServer: {
          id: `facebook-server-${(index % 3) + 1}`,
          name: `Facebook Server ${(index % 3) + 1}`,
          speed: index % 2 === 0 ? "On dinh" : "Nhanh",
        },
        serviceType: service?.serviceType || spec.serviceType,
      },
    ],
    totalAmount: amount,
    subTotal: amount,
    discountAmount: 0,
    status: statuses[index % statuses.length],
    paymentMethod: "bank_transfer",
    paymentDetails: {
      note: "Generated by createServiceOrderHistory.js",
      reference: `SEED-FB-SVC-${Date.now()}-${index + 1}`,
    },
    walletCharged: false,
    isDeleted: false,
    createdAt,
    updatedAt: createdAt,
  };
};

const formatVnd = (value) => new Intl.NumberFormat("vi-VN").format(value);

const main = async () => {
  await connectDB();

  const user = await User.findOne({ email: EMAIL.toLowerCase() });
  if (!user) {
    throw new Error(`User not found: ${EMAIL}`);
  }

  const services = await FacebookService.find({ platform: "facebook", isActive: true })
    .sort({ displayOrder: 1, createdAt: 1 })
    .lean();

  const amounts = makeAmounts();
  const orders = amounts.map((amount, index) => {
    const spec = facebookOrderPlan[index % facebookOrderPlan.length];
    return buildOrder(user, findMatchingService(services, spec), spec, amount, index, amounts.length);
  });
  const total = orders.reduce((sum, order) => sum + order.totalAmount, 0);

  console.log(`User: ${user.email} (${user._id})`);
  console.log(`Mode: ${apply ? "APPLY - write database" : "PREVIEW - no database write"}`);
  console.log(`Orders: ${orders.length}`);
  console.log(`Total: ${formatVnd(total)}d`);
  console.table(
    orders.map((order, index) => ({
      "#": index + 1,
      service: order.items[0].name,
      type: order.items[0].serviceType,
      url: Object.values(order.items[0].serviceUrls)[0],
      amount: `${formatVnd(order.totalAmount)}d`,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
    }))
  );

  if (!apply) {
    console.log("Run again with --apply to insert these orders.");
    return;
  }

  const created = await Order.insertMany(orders);
  console.log(`Created ${created.length} Facebook service orders for ${EMAIL}.`);
};

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
