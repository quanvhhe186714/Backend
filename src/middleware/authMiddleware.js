// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/users");

// Helper function để set CORS headers
const setCORSHeaders = (req, res) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "https://backend-cy6b.onrender.com",
    "https://frontend-ten-snowy-70.vercel.app",
    "https://shopnambs.id.vn"
  ];
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.header("Access-Control-Allow-Credentials", "true");
};

// Middleware để xác thực token
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // 1. Lấy token từ header
      token = req.headers.authorization.split(" ")[1];

      // 2. Giải mã token để lấy user ID
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "YOUR_JWT_SECRET"
      );

      // 3. Lấy thông tin user từ DB và gán vào request
      // Dùng .select('-password') để không lấy mật khẩu
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        setCORSHeaders(req, res);
        return res.status(401).json({ message: "Người dùng không tồn tại." });
      }

      next(); // Chuyển sang bước tiếp theo
    } catch (error) {
      setCORSHeaders(req, res);
      res.status(401).json({ message: "Không được cấp quyền, token không hợp lệ." });
    }
  }

  if (!token) {
    setCORSHeaders(req, res);
    res.status(401).json({ message: "Không được cấp quyền, không có token." });
  }
};

// Middleware để kiểm tra vai trò Admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    setCORSHeaders(req, res);
    res.status(403).json({ message: "Yêu cầu quyền Admin." });
  }
};
// Middleware để kiểm tra vai trò Manager
const isManager = (req, res, next) => {
  if (req.user && req.user.role === "manager") {
    next();
  } else {
    setCORSHeaders(req, res);
    res.status(403).json({ message: "Yêu cầu quyền Manager." });
  }
};

// Alias cho isAdmin
const admin = isAdmin;

module.exports = { isManager, protect, isAdmin, admin };