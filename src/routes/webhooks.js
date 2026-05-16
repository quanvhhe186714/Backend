const express = require("express");
const {
  handleBankPaymentWebhook,
  webhookHealth,
} = require("../controllers/webhookController");

const router = express.Router();

router.get("/health", webhookHealth);
router.post("/bank-payment", handleBankPaymentWebhook);

module.exports = router;
