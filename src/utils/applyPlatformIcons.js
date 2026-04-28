require("dotenv").config();

const mongoose = require("mongoose");
const FacebookService = require("../services/facebook/models/facebookService");

const FALLBACK_ICONS = {
  facebook: "https://cdn.mypanel.link/4cgr8h/9rjnzbd98rt8s5we.gif",
  tiktok: "https://cdn.mypanel.link/4cgr8h/ewzs0f9k8ic2932y.gif",
  youtube: "https://cdn.mypanel.link/sw177w/3y6jfcfgmm14jned.gif",
  instagram: "https://cdn.mypanel.link/4cgr8h/15z7egnk0elz7gzm.gif",
  twitter: "https://i.imgur.com/S9SejAz.gif",
  telegram: "https://cdn.mypanel.link/sw177w/7ea6iam2aygm0qws.gif",
};

const isImageIcon = (icon = "") => /^https?:\/\//i.test(icon);

const main = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const imported = await FacebookService.find({
    code: /^VIESMM_/,
    icon: /^https?:\/\//i,
  }).sort({ displayOrder: 1, basePrice: 1 });

  const platformIcons = { ...FALLBACK_ICONS };
  for (const service of imported) {
    if (service.platform && !platformIcons[service.platform]) {
      platformIcons[service.platform] = service.icon;
    }
  }

  const services = await FacebookService.find({ isActive: true });
  let updated = 0;

  for (const service of services) {
    const platform = service.platform || "facebook";
    const nextIcon = platformIcons[platform] || FALLBACK_ICONS.facebook;
    if (!isImageIcon(service.icon) && nextIcon) {
      service.icon = nextIcon;
      await service.save();
      updated += 1;
    }
  }

  console.log(`Updated ${updated}/${services.length} services`);
  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
