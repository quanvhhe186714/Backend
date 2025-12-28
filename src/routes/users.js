// routes/users.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { protect, isAdmin } = require("../middleware/authMiddleware");

// === Public Routes ===
// Các route không cần đăng nhập
router.post("/register", userController.registerUser);
router.post("/login", userController.loginUser);


// === Private Routes (Dành cho người dùng đã đăng nhập) ===
// ❗️❗️ Route tĩnh '/profile' và '/change-password' phải được đặt LÊN TRÊN route động '/:id'
router
  .route("/profile")
  .get(protect, userController.getMyProfile)
  .put(protect, userController.updateMyProfile);

// Route đổi mật khẩu
router.put("/change-password", protect, userController.changePassword);

// Route upload avatar
router.post("/upload-avatar", protect, userController.uploadAvatar);


// === Admin Routes (Chỉ Admin được truy cập) ===
// Route lấy tất cả user
router.route("/")
    .get(protect, isAdmin, userController.getAllUsers);

// Route xem password của user (chỉ Admin) - DEPRECATED (sẽ xóa sau)
router.get("/:id/password", protect, isAdmin, userController.getUserPassword);

// Route admin login as user (chỉ Admin)
router.post("/:id/login-as", protect, isAdmin, userController.loginAsUser);

// Route lấy số dư ví của user (chỉ Admin)
router.get("/:id/wallet", protect, isAdmin, userController.getUserWalletBalance);

// Route cập nhật số dư ví của user (chỉ Admin)
router.put("/:id/wallet", protect, isAdmin, userController.updateUserWalletBalance);

// Route xóa lịch sử mua hàng của user (chỉ Admin) - Hard delete
router.delete("/:id/orders", protect, isAdmin, userController.deleteUserOrderHistory);

// Route lấy đơn hàng của user (chỉ Admin)
router.get("/:id/orders", protect, isAdmin, userController.getUserOrders);

// Route lấy lịch sử thanh toán của user (chỉ Admin)
router.get("/:id/transactions", protect, isAdmin, userController.getUserTransactions);

// Route promote user lên admin (chỉ Admin)
router.post("/:id/promote", protect, isAdmin, userController.promoteUser);

// Route demote admin về customer (chỉ Admin)
router.post("/:id/demote", protect, isAdmin, userController.demoteUser);

//  Route động '/:id' phải được đặt ở CUỐI CÙNG
// Nó sẽ xử lý tất cả các trường hợp không khớp với các route tĩnh ở trên
router
  .route("/:id")
  .get(protect, isAdmin, userController.getUserById)
  .put(protect, isAdmin, userController.updateUser)
  .delete(protect, isAdmin, userController.deleteUser);


module.exports = router;