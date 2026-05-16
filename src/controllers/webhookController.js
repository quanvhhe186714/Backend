const {
  confirmTransactionSuccess,
  findPendingTransactionByTransfer,
} = require("../services/transactionConfirmService");

const isWebhookEnabled = () =>
  String(process.env.WEBHOOK_ENABLED || "").toLowerCase() === "true";

const verifyWebhookAuth = (req) => {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return false;

  const provider = (process.env.WEBHOOK_PROVIDER || "sepay").toLowerCase();

  if (provider === "sepay") {
    const auth = req.headers.authorization || "";
    return auth === `Apikey ${secret}` || auth === secret;
  }

  // Casso: secure-token header
  const token = req.headers["secure-token"] || req.headers["x-webhook-secret"];
  return token === secret;
};

const parseBankWebhookPayload = (body) => {
  const data = body?.data || body;

  const transferType =
    data?.transferType ?? body?.transferType ?? "in";

  const amount =
    data?.transferAmount ??
    data?.amount ??
    body?.transferAmount ??
    body?.amount;

  const description =
    data?.content ??
    data?.description ??
    data?.transferContent ??
    body?.content ??
    body?.description;

  const providerTransactionId = String(
    data?.id ??
      data?.transactionId ??
      body?.id ??
      body?.transactionId ??
      ""
  );

  return {
    amount,
    description,
    providerTransactionId: providerTransactionId || null,
    transferType,
  };
};

const handleBankPaymentWebhook = async (req, res) => {
  try {
    if (!isWebhookEnabled()) {
      return res.status(503).json({
        message: "Webhook chưa bật. Đặt WEBHOOK_ENABLED=true trên Render.",
      });
    }

    if (!verifyWebhookAuth(req)) {
      return res.status(401).json({ message: "Invalid webhook signature" });
    }

    const { amount, description, providerTransactionId, transferType } =
      parseBankWebhookPayload(req.body);

    if (transferType && transferType !== "in") {
      return res.status(200).json({ message: "Ignored non-incoming transfer" });
    }

    if (!description || amount == null) {
      return res.status(400).json({ message: "Invalid webhook payload" });
    }

    if (providerTransactionId) {
      const Transaction = require("../models/transaction");
      const existing = await Transaction.findOne({ providerTransactionId });
      if (existing?.status === "success") {
        return res.status(200).json({
          message: "Already processed",
          transactionId: existing._id,
        });
      }
    }

    const transaction = await findPendingTransactionByTransfer({
      description,
      amount,
    });

    if (!transaction) {
      console.warn("Webhook: no matching pending transaction", {
        description: String(description).slice(0, 80),
        amount,
      });
      return res.status(202).json({
        message: "Received but no matching pending transaction",
      });
    }

    const provider = (process.env.WEBHOOK_PROVIDER || "sepay").toLowerCase();
    const result = await confirmTransactionSuccess(transaction, {
      provider,
      providerTransactionId: providerTransactionId || `wh-${Date.now()}`,
    });

    return res.status(200).json({
      message: result.alreadyConfirmed
        ? "Transaction already confirmed"
        : "Transaction confirmed via webhook",
      transactionId: result.transaction._id,
    });
  } catch (error) {
    console.error("Webhook error:", error?.message || error);
    return res.status(error.status || 500).json({
      message: error.message || "Webhook processing failed",
    });
  }
};

const webhookHealth = (_req, res) => {
  res.status(200).json({
    enabled: isWebhookEnabled(),
    provider: process.env.WEBHOOK_PROVIDER || "sepay",
    endpoint: "POST /webhooks/bank-payment",
  });
};

module.exports = {
  handleBankPaymentWebhook,
  webhookHealth,
};
