const express = require("express");
const userRouter = require("./users");
const productRouter = require("./products");
const orderRouter = require("./orders");
const couponRouter = require("./coupons");
const paymentRouter = require("./payments");
const messageRouter = require("./messages");
const walletRouter = require("./wallet");
const fileRouter = require("./files");
const customQRRouter = require("./customQR");
const reviewRouter = require("./reviews");
const categoryRouter = require("./categories");
const facebookServiceRouter = require("../services/facebook/routes/facebookServices");

const router = express.Router();
router.use("/users", userRouter);
router.use("/products", productRouter);
router.use("/orders", orderRouter);
router.use("/coupons", couponRouter);
router.use("/payments", paymentRouter);
router.use("/messages", messageRouter);
router.use("/wallet", walletRouter);
router.use("/files", fileRouter);
router.use("/custom-qr", customQRRouter);
router.use("/reviews", reviewRouter);
router.use("/categories", categoryRouter);
router.use("/facebook-services", facebookServiceRouter);

module.exports = router;
