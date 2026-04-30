// controllers/userController.js
const User = require("../models/users");
const Wallet = require("../models/wallet");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const { upload } = require("../utils/Upload");

// Import passwordEncrypt với error handling để không ảnh hưởng login nếu có lỗi
let encryptPassword, decryptPassword;
try {
  const passwordEncrypt = require("../utils/passwordEncrypt");
  encryptPassword = passwordEncrypt.encryptPassword;
  decryptPassword = passwordEncrypt.decryptPassword;
} catch (error) {
  console.warn("⚠️ Failed to load passwordEncrypt utility (non-critical):", error.message);
  // Fallback functions - không làm gì cả, chỉ để tránh lỗi
  encryptPassword = () => "";
  decryptPassword = () => "[Encryption not available]";
}

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const createTokenResponse = (user, message = "Login successful") => {
  const payload = {
    id: user._id,
    name: user.name,
    role: user.role,
  };

  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET || "YOUR_JWT_SECRET",
    { expiresIn: "1h" }
  );

  return {
    message,
    token: `Bearer ${token}`,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    },
  };
};

const ensureUserWallet = async (userId) => {
  const existingWallet = await Wallet.findOne({ user: userId });
  if (!existingWallet) {
    await Wallet.create({ user: userId });
  }
};

const findOrCreateOAuthUser = async ({ email, name, avatar }) => {
  if (!email) {
    const error = new Error("Email is required from OAuth provider");
    error.status = 400;
    throw error;
  }

  let user = await User.findOne({ email: email.toLowerCase() });
  if (user) {
    if (user.status === "blocked") {
      const error = new Error("Account is blocked");
      error.status = 403;
      throw error;
    }

    let changed = false;
    if (!user.avatar && avatar) {
      user.avatar = avatar;
      changed = true;
    }
    if (!user.name && name) {
      user.name = name;
      changed = true;
    }
    if (changed) await user.save();
    await ensureUserWallet(user._id);
    return user;
  }

  const randomPassword = crypto.randomBytes(32).toString("hex");
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(randomPassword, salt);

  user = await User.create({
    name: name || email.split("@")[0],
    email: email.toLowerCase(),
    password: hashedPassword,
    passwordEncrypted: "",
    avatar: avatar || "",
    role: "customer",
  });

  await Wallet.create({ user: user._id });
  return user;
};

// 🟢 Upload avatar lên Cloudinary
const uploadAvatar = async (req, res) => {
  // Kiểm tra Cloudinary config (hỗ trợ cả CLOUDINARY_URL và các biến riêng lẻ)
  const hasCloudinaryConfig = process.env.CLOUDINARY_URL || 
    (process.env.CLOUDINARY_NAME && process.env.CLOUDINARY_KEY && process.env.CLOUDINARY_SECRET);
  
  if (!hasCloudinaryConfig) {
    console.error("❌ Cloudinary config missing!");
    return res.status(500).json({ 
      message: "Cloudinary configuration is missing. Please set CLOUDINARY_URL or CLOUDINARY_NAME, CLOUDINARY_KEY, CLOUDINARY_SECRET.",
      error: "CLOUDINARY_CONFIG_MISSING"
    });
  }

  // Log request info để debug
  console.log("📤 Upload request received:", {
    hasFile: !!req.file,
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length'],
    bodyKeys: Object.keys(req.body || {})
  });

  upload.single("avatar")(req, res, async (err) => {
    try {
      if (err) {
        console.error("❌ Multer error:", err);
        console.error("❌ Multer error details:", {
          message: err.message,
          code: err.code,
          field: err.field,
          storageErrors: err.storageErrors
        });
        return res.status(400).json({ 
          message: err.message || "Lỗi khi upload file",
          error: err.code || "UPLOAD_ERROR",
          details: err.storageErrors || err
        });
      }

      if (!req.file) {
        console.error("❌ No file received:", {
          files: req.files,
          body: req.body,
          headers: req.headers
        });
        return res.status(400).json({ 
          message: "Vui lòng chọn file ảnh",
          received: {
            hasFile: false,
            body: req.body,
            files: req.files
          }
        });
      }

      // Sử dụng secure_url để đảm bảo có full HTTPS URL
      const avatarUrl = req.file.secure_url || req.file.path;
      
      // Log để debug
      console.log("📸 Avatar upload info:", {
        path: req.file.path,
        secure_url: req.file.secure_url,
        url: req.file.url,
        finalUrl: avatarUrl
      });

      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }

      user.avatar = avatarUrl;
      await user.save();

      res.status(200).json({
        message: "✅ Upload avatar thành công!",
        avatarUrl,
      });
    } catch (error) {
      console.error("🔥 Upload error:", error);
      res.status(500).json({
        message: "Lỗi server khi upload ảnh",
        error: error.message,
      });
    }
  });
};

// 🟢 Đăng ký người dùng mới
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // 1. Kiểm tra email đã tồn tại chưa
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email đã tồn tại." });
    }

    // 2. Mã hóa mật khẩu (bcrypt hash để verify login)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // 3. Encrypt password để có thể xem lại (optional - nếu fail thì bỏ qua)
    let encryptedPassword = "";
    try {
      encryptedPassword = encryptPassword(password);
    } catch (encryptError) {
      console.warn("⚠️ Failed to encrypt password (non-critical):", encryptError.message);
      // Không throw error, chỉ log warning - user vẫn được tạo với bcrypt hash
      encryptedPassword = "";
    }

    // 4. Tạo người dùng mới
    const newUser = new User({
      name,
      email,
      password: hashedPassword, // bcrypt hash
      passwordEncrypted: encryptedPassword, // encrypted để xem lại (có thể empty nếu encrypt fail)
      role: role || 'customer', 
    });

    await newUser.save();
    await Wallet.create({ user: newUser._id });

    res.status(201).json({
      message: "Đăng ký thành công!",
      userId: newUser._id,
      email: newUser.email,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi đăng ký", error });
  }
};

// 🟢 Đăng nhập
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Tìm người dùng theo email
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ message: "Email hoặc mật khẩu không đúng." });
    }

    // 2. Kiểm tra trạng thái tài khoản
    if (user.status === "blocked") {
      return res.status(403).json({
        message: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin.",
      });
    }

    // 3. So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Email hoặc mật khẩu không đúng." });
    }

    // 3. Tạo JSON Web Token (JWT)
    const payload = {
      id: user._id,
      name: user.name,
      role: user.role,
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || "YOUR_JWT_SECRET",
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "Đăng nhập thành công!",
      token: `Bearer ${token}`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi đăng nhập", error });
  }
};

// 🟢 Lấy thông tin người dùng theo ID
const googleOAuthLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ message: "Google login is not configured" });
    }

    if (!credential) {
      return res.status(400).json({ message: "Missing Google credential" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload?.email_verified) {
      return res.status(400).json({ message: "Google email is not verified" });
    }

    const user = await findOrCreateOAuthUser({
      email: payload.email,
      name: payload.name,
      avatar: payload.picture,
    });

    res.status(200).json(createTokenResponse(user, "Google login successful"));
  } catch (error) {
    res.status(error.status || 401).json({
      message: error.message || "Google login failed",
    });
  }
};

const facebookOAuthLogin = async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!process.env.FACEBOOK_APP_ID) {
      return res.status(500).json({ message: "Facebook login is not configured" });
    }

    if (!accessToken) {
      return res.status(400).json({ message: "Missing Facebook access token" });
    }

    if (process.env.FACEBOOK_APP_SECRET) {
      const appToken = `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`;
      const debugUrl = `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(appToken)}`;
      const debugResponse = await fetch(debugUrl);
      const debugJson = await debugResponse.json();

      if (
        !debugJson?.data?.is_valid ||
        String(debugJson.data.app_id) !== String(process.env.FACEBOOK_APP_ID)
      ) {
        return res.status(401).json({ message: "Invalid Facebook access token" });
      }
    }

    const profileUrl = `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(accessToken)}`;
    const profileResponse = await fetch(profileUrl);
    const profile = await profileResponse.json();

    if (!profileResponse.ok || profile.error) {
      return res.status(401).json({
        message: profile.error?.message || "Facebook login failed",
      });
    }

    if (!profile.email) {
      return res.status(400).json({
        message: "Facebook account did not provide an email",
      });
    }

    const user = await findOrCreateOAuthUser({
      email: profile.email,
      name: profile.name,
      avatar: profile.picture?.data?.url,
    });

    res.status(200).json(createTokenResponse(user, "Facebook login successful"));
  } catch (error) {
    res.status(error.status || 401).json({
      message: error.message || "Facebook login failed",
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }
    res.status(200).json(user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi server khi lấy thông tin người dùng", error });
  }
};

// 🟢 Đổi mật khẩu
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    // Kiểm tra mật khẩu cũ
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Mật khẩu hiện tại không đúng." });
    }

    // Mã hóa mật khẩu mới (bcrypt hash)
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    // Encrypt password mới để có thể xem lại (optional - nếu fail thì bỏ qua)
    try {
      user.passwordEncrypted = encryptPassword(newPassword);
    } catch (encryptError) {
      console.warn("⚠️ Failed to encrypt password (non-critical):", encryptError.message);
      // Không throw error, chỉ log warning - password vẫn được đổi với bcrypt hash
      user.passwordEncrypted = user.passwordEncrypted || ""; // Giữ nguyên nếu có, hoặc empty
    }
    
    await user.save();

    res.status(200).json({ message: "Đổi mật khẩu thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi đổi mật khẩu", error });
  }
};

// 🟢 Lấy thông tin cá nhân (người dùng đã đăng nhập)
const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi lấy hồ sơ", error });
  }
};

// 🟢 Cập nhật thông tin cá nhân
const updateMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      user.name = req.body.name || user.name;
      user.avatar = req.body.avatar || user.avatar;

      const updatedUser = await user.save();

      res.status(200).json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        avatar: updatedUser.avatar,
      });
    } else {
      res.status(404).json({ message: "Không tìm thấy người dùng." });
    }
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi cập nhật hồ sơ", error });
  }
};

// === CHỨC NĂNG CỦA ADMIN ===

// 🟢 Lấy tất cả người dùng (chỉ Admin) - bao gồm wallet balance
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select("-password")
      .select("name email role status avatar");
    
    // Lấy wallet balance cho mỗi user
    const usersWithBalance = await Promise.all(
      users.map(async (user) => {
        let wallet = await Wallet.findOne({ user: user._id });
        if (!wallet) {
          wallet = await Wallet.create({ user: user._id, balance: 0 });
        }
        return {
          ...user.toObject(),
          balance: wallet.balance
        };
      })
    );

    res.status(200).json(usersWithBalance);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi server khi lấy danh sách người dùng", error });
  }
};

// 🟢 Cập nhật người dùng bất kỳ (chỉ Admin)
const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      user.name = req.body.name || user.name;
      // Admin có thể thay đổi role và status
      user.role = req.body.role || user.role;
      // Cập nhật trạng thái nếu được cung cấp
      if (req.body.status) {
        user.status = req.body.status;
      }

      const updatedUser = await user.save();
      res.status(200).json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
      });
    } else {
      res.status(404).json({ message: "Không tìm thấy người dùng" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi server khi cập nhật người dùng", error });
  }
};

// 🟢 Xóa người dùng (chỉ Admin)
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      await user.deleteOne(); // Hoặc user.remove() ở Mongoose cũ
      res.status(200).json({ message: "Người dùng đã được xóa." });
    } else {
      res.status(404).json({ message: "Không tìm thấy người dùng." });
    }
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi xóa người dùng", error });
  }
};

// 🟢 Xem password của user (chỉ Admin) - DECRYPT password
const getUserPassword = async (req, res) => {
  try {
    // Chỉ admin mới được xem password
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chỉ admin mới được xem password." });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    // Decrypt password
    let decryptedPassword = null;
    if (user.passwordEncrypted) {
      try {
        decryptedPassword = decryptPassword(user.passwordEncrypted);
      } catch (error) {
        console.error('Decrypt error:', error);
        decryptedPassword = "[Không thể decrypt - có thể là password cũ chưa được encrypt]";
      }
    } else {
      decryptedPassword = "[Chưa có encrypted password - user cũ]";
    }

    res.status(200).json({
      userId: user._id,
      email: user.email,
      name: user.name,
      password: decryptedPassword,
      note: "⚠️ Password này chỉ hiển thị cho admin. Hãy bảo mật thông tin này."
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi lấy password", error: error.message });
  }
};

// 🟢 Admin login as user (impersonate) - Admin có thể đăng nhập vào tài khoản user
const loginAsUser = async (req, res) => {
  try {
    // Chỉ admin mới được login as user
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chỉ admin mới được login as user." });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    // Kiểm tra trạng thái tài khoản
    if (targetUser.status === "blocked") {
      return res.status(403).json({
        message: "Tài khoản này đã bị khóa.",
      });
    }

    // Tạo JWT token cho user đó (giống như login bình thường)
    const payload = {
      id: targetUser._id,
      name: targetUser.name,
      role: targetUser.role,
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || "YOUR_JWT_SECRET",
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: `Đăng nhập thành công với tài khoản ${targetUser.email}`,
      token: `Bearer ${token}`,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        avatar: targetUser.avatar
      },
      impersonated: true, // Flag để biết đây là login as user
      originalAdminId: req.user.id // Lưu ID admin gốc để có thể quay lại
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi login as user", error: error.message });
  }
};

// 🟢 Admin: Lấy số dư ví của user (chỉ Admin)
const getUserWalletBalance = async (req, res) => {
  try {
    // Chỉ admin mới được xem balance
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chỉ admin mới được xem số dư ví." });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    // Tìm hoặc tạo wallet cho user
    let wallet = await Wallet.findOne({ user: user._id });
    if (!wallet) {
      wallet = await Wallet.create({ user: user._id, balance: 0 });
    }

    res.status(200).json({
      userId: user._id,
      email: user.email,
      name: user.name,
      balance: wallet.balance,
      currency: wallet.currency || "VND"
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi lấy số dư ví", error: error.message });
  }
};

// 🟢 Admin: Cập nhật số dư ví của user (chỉ Admin) - có thể cộng hoặc trừ
const updateUserWalletBalance = async (req, res) => {
  try {
    // Chỉ admin mới được cập nhật balance
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chỉ admin mới được cập nhật số dư ví." });
    }

    const { amount, operation } = req.body; // operation: 'add' hoặc 'subtract'
    const userId = req.params.id;

    if (!amount || isNaN(amount)) {
      return res.status(400).json({ message: "Số tiền không hợp lệ." });
    }

    if (!['add', 'subtract'].includes(operation)) {
      return res.status(400).json({ message: "Operation phải là 'add' hoặc 'subtract'." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    // Tìm hoặc tạo wallet cho user
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      wallet = await Wallet.create({ user: userId, balance: 0 });
    }

    const amountNum = parseFloat(amount);
    const oldBalance = wallet.balance;

    if (operation === 'add') {
      wallet.balance += amountNum;
    } else if (operation === 'subtract') {
      if (wallet.balance < amountNum) {
        return res.status(400).json({ 
          message: `Số dư hiện tại (${oldBalance}) không đủ để trừ ${amountNum}.` 
        });
      }
      wallet.balance -= amountNum;
    }

    await wallet.save();

    res.status(200).json({
      message: `Đã ${operation === 'add' ? 'cộng' : 'trừ'} ${amountNum} vào ví của ${user.email}`,
      userId: user._id,
      email: user.email,
      name: user.name,
      oldBalance,
      newBalance: wallet.balance,
      operation,
      amount: amountNum
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi cập nhật số dư ví", error: error.message });
  }
};

// 🟢 Admin: Xóa lịch sử mua hàng của user (chỉ Admin) - Hard delete (giữ lại để tương thích)
const deleteUserOrderHistory = async (req, res) => {
  try {
    // Chỉ admin mới được xóa lịch sử mua hàng
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chỉ admin mới được xóa lịch sử mua hàng." });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    const Order = require("../models/order");
    const result = await Order.deleteMany({ user: user._id });

    res.status(200).json({
      message: `Đã xóa ${result.deletedCount} đơn hàng của ${user.email}`,
      userId: user._id,
      email: user.email,
      name: user.name,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi xóa lịch sử mua hàng", error: error.message });
  }
};

// 🟢 Admin: Lấy đơn hàng của user (chỉ Admin) - có thể filter theo status
const getUserOrders = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chỉ admin mới được xem đơn hàng của user." });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    const Order = require("../models/order");
    const { status, includeDeleted } = req.query;
    
    let query = { user: user._id };
    
    // Filter theo status nếu có
    if (status) {
      query.status = status;
    }
    
    // Bao gồm đơn hàng đã xóa nếu includeDeleted=true
    // Sử dụng $ne: true để match cả document cũ không có trường isDeleted
    if (includeDeleted !== 'true') {
      query.isDeleted = { $ne: true };
    }

    const orders = await Order.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      userId: user._id,
      email: user.email,
      name: user.name,
      orders
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi lấy đơn hàng", error: error.message });
  }
};

// 🟢 Admin: Lấy lịch sử thanh toán (transactions) của user (chỉ Admin)
const getUserTransactions = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chỉ admin mới được xem lịch sử thanh toán của user." });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    const Transaction = require("../models/transaction");
    const { status, includeDeleted } = req.query;
    
    let query = { user: user._id };
    
    // Filter theo status nếu có
    if (status) {
      query.status = status;
    }
    
    // Bao gồm transaction đã xóa nếu includeDeleted=true
    // Sử dụng $ne: true để match cả document cũ không có trường isDeleted
    if (includeDeleted !== 'true') {
      query.isDeleted = { $ne: true };
    }

    const transactions = await Transaction.find(query)
      .populate('user', 'name email')
      .populate('confirmedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      userId: user._id,
      email: user.email,
      name: user.name,
      transactions
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi lấy lịch sử thanh toán", error: error.message });
  }
};

// 🟢 Admin: Xóa mềm đơn hàng (chỉ Admin)
const softDeleteOrder = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chỉ admin mới được xóa đơn hàng." });
    }

    const Order = require("../models/order");
    const order = await Order.findById(req.params.id); // Sửa từ orderId thành id
    
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    }

    if (order.isDeleted) {
      return res.status(400).json({ message: "Đơn hàng đã bị xóa trước đó." });
    }

    order.isDeleted = true;
    order.deletedAt = new Date();
    order.deletedBy = req.user._id;
    await order.save();

    res.status(200).json({
      message: "Đã xóa đơn hàng thành công",
      order
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi xóa đơn hàng", error: error.message });
  }
};

// 🟢 Admin: Khôi phục đơn hàng (chỉ Admin)
const restoreOrder = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chỉ admin mới được khôi phục đơn hàng." });
    }

    const Order = require("../models/order");
    const order = await Order.findById(req.params.id); // Sửa từ orderId thành id
    
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    }

    if (!order.isDeleted) {
      return res.status(400).json({ message: "Đơn hàng chưa bị xóa." });
    }

    order.isDeleted = false;
    order.deletedAt = null;
    order.deletedBy = null;
    await order.save();

    res.status(200).json({
      message: "Đã khôi phục đơn hàng thành công",
      order
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi khôi phục đơn hàng", error: error.message });
  }
};

// 🟢 Admin: Xóa mềm transaction (chỉ Admin)
const softDeleteTransaction = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chỉ admin mới được xóa giao dịch." });
    }

    const Transaction = require("../models/transaction");
    const transaction = await Transaction.findById(req.params.id); // Sửa từ transactionId thành id
    
    if (!transaction) {
      return res.status(404).json({ message: "Không tìm thấy giao dịch." });
    }

    if (transaction.isDeleted) {
      return res.status(400).json({ message: "Giao dịch đã bị xóa trước đó." });
    }

    transaction.isDeleted = true;
    transaction.deletedAt = new Date();
    transaction.deletedBy = req.user._id;
    await transaction.save();

    res.status(200).json({
      message: "Đã xóa giao dịch thành công",
      transaction
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi xóa giao dịch", error: error.message });
  }
};

// 🟢 Admin: Khôi phục transaction (chỉ Admin)
const restoreTransaction = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chỉ admin mới được khôi phục giao dịch." });
    }

    const Transaction = require("../models/transaction");
    const transaction = await Transaction.findById(req.params.id); // Sửa từ transactionId thành id
    
    if (!transaction) {
      return res.status(404).json({ message: "Không tìm thấy giao dịch." });
    }

    if (!transaction.isDeleted) {
      return res.status(400).json({ message: "Giao dịch chưa bị xóa." });
    }

    transaction.isDeleted = false;
    transaction.deletedAt = null;
    transaction.deletedBy = null;
    await transaction.save();

    res.status(200).json({
      message: "Đã khôi phục giao dịch thành công",
      transaction
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi khôi phục giao dịch", error: error.message });
  }
};

// 🟢 Admin: Promote user lên admin (chỉ Admin)
const promoteUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chỉ admin mới được promote user." });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    // Không cho phép promote chính mình
    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Bạn không thể promote chính mình." });
    }

    // Kiểm tra user đã là admin chưa
    if (targetUser.role === 'admin') {
      return res.status(400).json({ message: "Người dùng này đã là admin." });
    }

    targetUser.role = 'admin';
    await targetUser.save();

    res.status(200).json({
      message: `Đã promote ${targetUser.email} lên admin thành công`,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi promote user", error: error.message });
  }
};

// 🟢 Admin: Demote admin về customer (chỉ Admin)
const demoteUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chỉ admin mới được demote user." });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    // Không cho phép demote chính mình
    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Bạn không thể demote chính mình." });
    }

    // Kiểm tra user đã là customer chưa
    if (targetUser.role === 'customer') {
      return res.status(400).json({ message: "Người dùng này đã là customer." });
    }

    targetUser.role = 'customer';
    await targetUser.save();

    res.status(200).json({
      message: `Đã demote ${targetUser.email} về customer thành công`,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi demote user", error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  googleOAuthLogin,
  facebookOAuthLogin,
  getUserById,
  getMyProfile,
  updateMyProfile,
  getAllUsers,
  updateUser,
  deleteUser,
  changePassword,
  uploadAvatar,
  getUserPassword,
  loginAsUser,
  getUserWalletBalance,
  updateUserWalletBalance,
  deleteUserOrderHistory,
  getUserOrders,
  getUserTransactions,
  softDeleteOrder,
  restoreOrder,
  softDeleteTransaction,
  restoreTransaction,
  promoteUser,
  demoteUser,
};
