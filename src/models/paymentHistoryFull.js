const mongoose = require("mongoose");

// Flexible schema because imported data may vary
const PaymentHistoryFullSchema = new mongoose.Schema({}, {
  strict: false,
  collection: "payment_history_full",
});

module.exports = mongoose.model("PaymentHistoryFull", PaymentHistoryFullSchema);

