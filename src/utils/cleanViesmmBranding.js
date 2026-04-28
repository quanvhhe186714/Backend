require("dotenv").config();

const mongoose = require("mongoose");
const FacebookService = require("../services/facebook/models/facebookService");

const main = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const services = await FacebookService.find({ code: /^VIESMM_/ });
  let updated = 0;

  for (const service of services) {
    const sourceId = String(service.code || "").replace(/^VIESMM_/i, "");
    const baseName = service.name.replace(/^\[VIESMM\s*#?\d*\]\s*/i, "").trim();
    const cleanName = /-\s*Gói\s*\d+$/i.test(baseName)
      ? baseName
      : `${baseName} - Gói ${sourceId}`;
    const cleanDescription = (service.description || "")
      .replace(/\s*Source:\s*VIESMM public services\.?/i, "")
      .trim();

    if (cleanName !== service.name || cleanDescription !== service.description) {
      service.name = cleanName;
      service.description = cleanDescription;
      await service.save();
      updated += 1;
    }
  }

  console.log(`Updated ${updated}/${services.length} imported services`);
  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
