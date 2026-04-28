require("dotenv").config();

const mongoose = require("mongoose");
const FacebookService = require("../services/facebook/models/facebookService");

const SOURCE_URL = "https://viesmm.com/services";
const SUPPORTED_PLATFORMS = ["facebook", "tiktok", "youtube", "instagram", "twitter", "telegram"];
const DEFAULT_LIMIT_PER_GROUP = Number(process.env.VIESMM_LIMIT_PER_GROUP || 3);

const decodeHtml = (value = "") =>
  value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

const stripTags = (value = "") => decodeHtml(value.replace(/<[^>]*>/g, " "));

const parseNumber = (value = "") => Number(String(value).replace(/[^\d]/g, "")) || 0;

const extractAttr = (html, name) => {
  const match = html.match(new RegExp(`${name}="([^"]*)"`, "i"));
  return match ? decodeHtml(match[1]) : "";
};

const normalizeUrl = (url = "") => {
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `https://viesmm.com${url}`;
  return url;
};

const detectPlatform = (category, name) => {
  const text = `${category} ${name}`.toLowerCase();
  if (text.includes("telegram")) return "telegram";
  if (text.includes("facebook") || text.includes("fanpage")) return "facebook";
  if (text.includes("tiktok")) return "tiktok";
  if (text.includes("youtube") || text.includes("watchtime") || text.includes("subscriber")) return "youtube";
  if (text.includes("instagram")) return "instagram";
  if (text.includes("twitter") || text.includes("/x") || text.includes("tweet")) return "twitter";
  return null;
};

const detectServiceType = (category, name) => {
  const text = `${category} ${name}`.toLowerCase();
  if (text.includes("comment")) return "COMMENT";
  if (text.includes("share") || text.includes("retweet")) return "SHARE_POST";
  if (text.includes("livestream") || text.includes("live stream") || text.includes("live")) return "VIEW_LIVESTREAM";
  if (text.includes("story")) return "VIEW_STORY";
  if (text.includes("member") && text.includes("telegram")) return "MEMBER_GROUP";
  if (text.includes("follow") || text.includes("subscriber") || text.includes("sub ")) return "FOLLOW";
  if (text.includes("view") || text.includes("watchtime") || text.includes("watch time")) return "VIEW_VIDEO";
  if (text.includes("reaction") || text.includes("like") || text.includes("tim ")) return "LIKE_POST";
  return "LIKE_POST";
};

const detectRequiredFields = (platform, serviceType, category, name) => {
  const text = `${category} ${name}`.toLowerCase();
  if (serviceType === "MEMBER_GROUP" || text.includes("group")) return ["group_url"];
  if (serviceType === "VIEW_LIVESTREAM") return ["livestream_url"];
  if (serviceType === "VIEW_STORY") return ["story_url"];
  if (serviceType === "FOLLOW") return platform === "facebook" ? ["fanpage_url"] : ["post_url"];
  return ["post_url"];
};

const detectUnitLabel = (serviceType) => {
  if (serviceType === "MEMBER_GROUP") return "member";
  if (serviceType === "FOLLOW") return "follow";
  if (serviceType === "COMMENT") return "comment";
  if (serviceType === "SHARE_POST") return "share";
  if (serviceType === "VIEW_LIVESTREAM") return "mắt";
  if (serviceType === "VIEW_STORY" || serviceType === "VIEW_VIDEO") return "view";
  return "like";
};

const detectStatus = (name, badges) => {
  const text = `${name} ${badges}`.toLowerCase();
  if (text.includes("maintenance") || text.includes("bảo trì")) return "maintenance";
  if (text.includes("slow") || text.includes("chậm")) return "slow";
  if (text.includes("drop") || text.includes("tụt")) return "dropping";
  return "stable";
};

const detectWarrantyDays = (name, badges) => {
  const text = `${name} ${badges}`;
  const dayMatch = text.match(/(\d+)\s*(days?|ngày)/i);
  if (dayMatch) return Number(dayMatch[1]);
  if (/no refill|không bảo hành/i.test(text)) return 0;
  if (/refill|bảo hành/i.test(text)) return 30;
  return 7;
};

const scoreCandidate = (service) => {
  const text = `${service.name} ${service.badges}`.toLowerCase();
  let score = 0;
  if (text.includes("đề xuất") || text.includes("recommendation")) score += 50;
  if (text.includes("best seller") || text.includes("bán chạy")) score += 35;
  if (text.includes("owner") || text.includes("tự sản xuất")) score += 20;
  if (text.includes("refill") || text.includes("bảo hành")) score += 15;
  if (text.includes("instant") || text.includes("fast") || text.includes("nhanh")) score += 10;
  if (text.includes("no refill") || text.includes("không bảo hành")) score -= 15;
  score -= Math.min(service.rate / 1000, 100);
  return score;
};

const parseServices = (html) => {
  const rows = html.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];
  const services = [];
  let currentCategory = "";
  let currentIcon = "";

  for (const row of rows) {
    if (!/class="[^"]*\bservice\b/i.test(row)) continue;

    if (/colspan=/i.test(row)) {
      currentCategory = stripTags(row);
      currentIcon = normalizeUrl(extractAttr(row.match(/<img\b[\s\S]*?>/i)?.[0] || "", "src"));
      continue;
    }

    const cells = row.match(/<td\b[\s\S]*?<\/td>/gi) || [];
    if (cells.length < 6) continue;

    const id = parseNumber(stripTags(cells[1]));
    const nameMatch = cells[2].match(/<span>([\s\S]*?)<\/span>/i);
    const name = stripTags(nameMatch ? nameMatch[1] : cells[2]);
    const badges = stripTags((cells[2].match(/<div>([\s\S]*?)<\/div>/i) || [null, ""])[1]);
    const rate = parseNumber(stripTags(cells[3]));
    const min = parseNumber(stripTags(cells[4]));
    const max = parseNumber(stripTags(cells[5]));

    if (!id || !name || !rate) continue;

    const platform = detectPlatform(currentCategory, name);
    if (!platform || !SUPPORTED_PLATFORMS.includes(platform)) continue;

    const serviceType = detectServiceType(currentCategory, name);
    services.push({
      sourceId: id,
      category: currentCategory,
      icon: currentIcon,
      name,
      badges,
      platform,
      serviceType,
      requiredFields: detectRequiredFields(platform, serviceType, currentCategory, name),
      unitLabel: detectUnitLabel(serviceType),
      rate,
      min,
      max,
      status: detectStatus(name, badges),
      warrantyDays: detectWarrantyDays(name, badges),
      dataRate: parseNumber(extractAttr(row, "data-rate")),
    });
  }

  return services;
};

const selectServices = (services, limitPerGroup) => {
  const groups = new Map();
  for (const service of services) {
    const key = `${service.platform}:${service.serviceType}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(service);
  }

  return [...groups.values()].flatMap((group) =>
    group
      .sort((a, b) => scoreCandidate(b) - scoreCandidate(a) || a.rate - b.rate)
      .slice(0, limitPerGroup)
  );
};

const toMongoPayload = (service, displayOrder) => {
  const quantities = [1000, 5000, 10000, 50000, 100000].filter(
    (quantity) => quantity >= Math.max(service.min, 1) && quantity <= service.max
  );

  return {
    platform: service.platform,
    name: `${service.name} - Gói ${service.sourceId}`,
    code: `VIESMM_${service.sourceId}`,
    description: `${service.category}. Min: ${service.min}. Max: ${service.max}.`,
    icon: service.icon,
    basePrice: service.rate,
    unit: "1000",
    unitLabel: service.unitLabel,
    minPrice: 0,
    maxPrice: null,
    processingTime: 5,
    completionTime: 120,
    serviceType: service.serviceType,
    requiredFields: service.requiredFields,
    isActive: true,
    displayOrder,
    status: service.status,
    dropRate: service.status === "dropping" ? 10 : 0,
    priceTable: (quantities.length ? quantities : [Math.max(service.min, 1)]).map((quantity) => ({
      quantity,
      price: Math.ceil((quantity / 1000) * service.rate),
    })),
    warrantyDays: service.warrantyDays,
    totalReviewers: null,
    instructions: [
      "Nhập đúng link công khai.",
      "Không đặt trùng link khi đơn cũ chưa hoàn tất.",
      "Giá tham chiếu từ VIESMM public services.",
    ],
  };
};

const main = async () => {
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limitPerGroup = limitArg ? Number(limitArg.split("=")[1]) : DEFAULT_LIMIT_PER_GROUP;

  console.log(`Fetching ${SOURCE_URL}`);
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`VIESMM request failed: ${response.status}`);
  }

  const html = await response.text();
  const parsed = parseServices(html);
  const selected = selectServices(parsed, limitPerGroup);

  await mongoose.connect(process.env.MONGO_URI);

  let upserted = 0;
  let modified = 0;
  for (const [index, service] of selected.entries()) {
    const payload = toMongoPayload(service, 10000 + index);
    const result = await FacebookService.updateOne(
      { code: payload.code },
      { $set: payload },
      { upsert: true, runValidators: true }
    );
    upserted += result.upsertedCount || 0;
    modified += result.modifiedCount || 0;
  }

  console.log(
    JSON.stringify(
      {
        parsed: parsed.length,
        selected: selected.length,
        upserted,
        modified,
        limitPerGroup,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
