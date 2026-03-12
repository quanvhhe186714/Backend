// server.js
const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db.js");
const router = require("./src/routes");
const seedBankFeeds = require("./src/utils/seedBankFeeds");

dotenv.config();

const app = express();

// Helper function để set CORS headers
const setCORSHeaders = (req, res) => {
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "https://backend-cy6b.onrender.com",
    "frontend-ten-snowy-70.vercel.app",
    "https://shopnambs.id.vn",
    "https://webbuffmxh.online"
  ];
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  } else if (origin) {
    // Log nếu origin không trong allowed list
    console.warn(`CORS: Origin ${origin} not in allowed list`);
  }

  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH"
  );
  res.header("Access-Control-Allow-Credentials", "true");
};

// CORS middleware - ĐẶT TRƯỚC TẤT CẢ MIDDLEWARE KHÁC (kể cả express.json)
app.use((req, res, next) => {
  setCORSHeaders(req, res);

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  return next();
});

// Middlewares - Đặt SAU CORS middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));
app.use("/invoices", express.static("invoices"));

// Kết nối MongoDB
connectDB().then(() => {
  // Seed bank feeds nếu chưa có
  seedBankFeeds().catch((e) => console.error("Seed bank feeds error", e));
});

// Mount routes
app.use("/", router);

// Route test nhanh
app.get("/", (_req, res) => {
  res.send("🚀 Server is running and connected to MongoDB");
});

// Global error handler
app.use((err, req, res, next) => {
  setCORSHeaders(req, res);
  console.error("Global error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
  return next(err);
});

// 404 handler
app.use((req, res) => {
  setCORSHeaders(req, res);
  res.status(404).json({ message: "Route not found" });
});

const port = process.env.PORT || 9999;
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
