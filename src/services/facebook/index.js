// Export tất cả từ Facebook service module
module.exports = {
  model: require("./models/facebookService"),
  controller: require("./controllers/facebookServiceController"),
  routes: require("./routes/facebookServices"),
  seed: require("./utils/seedFacebookServices")
};

