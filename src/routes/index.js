const express = require("express");
const userRouter = require("./users");
const productRouter = require("./products");
const orderRouter = require("./orders");
const couponRouter = require("./coupons");
const paymentRouter = require("./payments");
const messageRouter = require("./messages");
const walletRouter = require("./wallet");
const facebookServiceRouter = require("../services/facebook/routes/facebookServices");

const router = express.Router();
router.use("/users", userRouter);
router.use("/products", productRouter);
router.use("/orders", orderRouter);
router.use("/coupons", couponRouter);
router.use("/payments", paymentRouter);
router.use("/messages", messageRouter);
router.use("/wallet", walletRouter);
router.use("/facebook-services", facebookServiceRouter);

module.exports = router;
