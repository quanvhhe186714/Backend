require("dotenv").config();
const mongoose = require("mongoose");
const FB = require("./src/models/facebookService");

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const r = await FB.updateMany(
    { platform: { $exists: false } },
    { $set: { platform: "facebook" } }
  );
  console.log("Updated:", r.modifiedCount);
  mongoose.disconnect();
});
