const { handleSePayWebhook, getSePayAccountInfo } = require("../services/sepayService");
const { runManualCheck } = require("../jobs/transactionPolling");
const Transaction = require("../models/transaction");
const Wallet = require("../models/wallet");

/**
 * Controller xử lý webhook từ SePay
 * POST /payments/sepay/webhook
 */
const receiveWebhook = async (req, res) => {
  try {
    const webhookData = req.body;

    console.log("📥 SePay Webhook received:", {
      timestamp: new Date().toISOString(),
      data: webhookData,
    });

    // Xử lý webhook
    const result = await handleSePayWebhook(webhookData);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: result.message || "Webhook processed successfully",
        data: result.transaction,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.error || "Failed to process webhook",
      });
    }
  } catch (error) {
    console.error("❌ Error in SePay webhook controller:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Lấy thông tin tài khoản SePay
 * GET /payments/sepay/account-info
 */
const getAccountInfo = async (req, res) => {
  try {
    const accountInfo = getSePayAccountInfo();
    return res.status(200).json({
      success: true,
      data: accountInfo,
    });
  } catch (error) {
    console.error("❌ Error getting SePay account info:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get account info",
      error: error.message,
    });
  }
};

/**
 * Test webhook endpoint (dùng để test local)
 * POST /payments/sepay/test-webhook
 */
const testWebhook = async (req, res) => {
  try {
    const testData = {
      transaction_id: `TEST-${Date.now()}`,
      reference_code: req.body.reference_code || `TEST-REF-${Date.now()}`,
      amount: req.body.amount || 100000,
      content: req.body.content || "Test payment",
      account_no: req.body.account_no || "1234567890",
      account_name: req.body.account_name || "Test User",
      bank_code: "mb",
      transaction_date: new Date().toISOString(),
      status: req.body.status || "success",
    };

    console.log("🧪 Testing SePay webhook with data:", testData);

    const result = await handleSePayWebhook(testData);

    return res.status(200).json({
      success: result.success,
      message: "Test webhook processed",
      testData,
      result,
    });
  } catch (error) {
    console.error("❌ Error in test webhook:", error);
    return res.status(500).json({
      success: false,
      message: "Test webhook failed",
      error: error.message,
    });
  }
};

/**
 * Kiểm tra thủ công các transaction pending
 * POST /payments/sepay/check-pending
 */
const manualCheckTransactions = async (req, res) => {
  try {
    console.log("🔍 Manual check transactions requested by user:", req.user._id);
    
    const result = await runManualCheck();
    
    return res.status(200).json({
      success: true,
      message: "Manual check completed",
      data: result,
    });
  } catch (error) {
    console.error("❌ Error in manual check controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check transactions",
      error: error.message,
    });
  }
};

module.exports = {
  receiveWebhook,
  getAccountInfo,
  testWebhook,
  manualCheckTransactions,
};

