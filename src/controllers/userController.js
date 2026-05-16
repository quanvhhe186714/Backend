// controllers/userController.js
const User = require("../models/users");
const Wallet = require("../models/wallet");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const { upload } = require("../utils/Upload");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required");
  }
  return process.env.JWT_SECRET;
};

const createTokenResponse = (user, message = "Login successful") => {
  const payload = {
    id: user._id,
    name: user.name,
    role: user.role,
  };

  const token = jwt.sign(payload, getJwtSecret(), { expiresIn: "1h" });

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
    avatar: avatar || "",
    role: "customer",
  });

  await Wallet.create({ user: user._id });
  return user;
};

const uploadAvatar = async (req, res) => {
  const hasCloudinaryConfig =
    process.env.CLOUDINARY_URL ||
    (process.env.CLOUDINARY_NAME &&
      process.env.CLOUDINARY_KEY &&
      process.env.CLOUDINARY_SECRET);

  if (!hasCloudinaryConfig) {
    return res.status(500).json({
      message: "Cloudinary configuration is missing.",
      error: "CLOUDINARY_CONFIG_MISSING",
    });
  }

  upload.single("avatar")(req, res, async (err) => {
    try {
      if (err) {
        return res.status(400).json({
          message: err.message || "Upload failed",
          error: err.code || "UPLOAD_ERROR",
        });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Vui long chon file anh" });
      }

      const avatarUrl = req.file.secure_url || req.file.path;
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ message: "Khong tim thay nguoi dung" });
      }

      user.avatar = avatarUrl;
      await user.save();

      return res.status(200).json({
        message: "Upload avatar thanh cong",
        avatarUrl,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Loi server khi upload anh",
        error: error.message,
      });
    }
  });
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required." });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "Email da ton tai." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "customer",
    });
    await Wallet.create({ user: newUser._id });

    return res.status(201).json({
      message: "Dang ky thanh cong!",
      userId: newUser._id,
      email: newUser.email,
    });
  } catch (error) {
    return res.status(500).json({ message: "Loi server khi dang ky", error: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email || "").trim().toLowerCase() });

    if (!user) {
      return res.status(400).json({ message: "Email hoac mat khau khong dung." });
    }
    if (user.status === "blocked") {
      return res.status(403).json({ message: "Tai khoan cua ban da bi khoa." });
    }

    const isMatch = await bcrypt.compare(password || "", user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Email hoac mat khau khong dung." });
    }

    await ensureUserWallet(user._id);
    return res.status(200).json(createTokenResponse(user, "Dang nhap thanh cong!"));
  } catch (error) {
    return res.status(500).json({ message: "Loi server khi dang nhap", error: error.message });
  }
};

const googleOAuthLogin = async (req, res) => {
  try {
    const { credential } = req.body;
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
    return res.status(200).json(createTokenResponse(user, "Google login successful"));
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.message || "Google login failed",
    });
  }
};

const facebookOAuthLogin = async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ message: "Missing Facebook access token" });
    }

    const profileUrl = `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(accessToken)}`;
    const profile = await fetch(profileUrl).then((response) => response.json());
    if (!profile.email) {
      return res.status(400).json({ message: "Facebook account did not provide an email" });
    }

    const user = await findOrCreateOAuthUser({
      email: profile.email,
      name: profile.name,
      avatar: profile.picture?.data?.url,
    });
    return res.status(200).json(createTokenResponse(user, "Facebook login successful"));
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.message || "Facebook login failed",
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching user", error: error.message });
  }
};

const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching profile", error: error.message });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (req.body.name) {
      user.name = String(req.body.name).trim();
    }
    if (req.body.avatar !== undefined) {
      user.avatar = req.body.avatar;
    }
    await user.save();
    return res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error updating profile", error: error.message });
  }
};

const getAllUsers = async (_req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching users", error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.body.name !== undefined) user.name = String(req.body.name).trim();
    if (req.body.avatar !== undefined) user.avatar = req.body.avatar;
    if (req.body.status !== undefined) user.status = req.body.status;
    if (req.body.role !== undefined) user.role = req.body.role;

    await user.save();
    return res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      avatar: user.avatar,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error updating user", error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Error deleting user", error: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword || "", user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.status(200).json({ message: "Password changed successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Error changing password", error: error.message });
  }
};


// ðŸŸ¢ Admin login as user (impersonate) - Admin cÃ³ thá»ƒ Ä‘Äƒng nháº­p vÃ o tÃ i khoáº£n user
const loginAsUser = async (req, res) => {
  try {
    // Chá»‰ admin má»›i Ä‘Æ°á»£c login as user
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chá»‰ admin má»›i Ä‘Æ°á»£c login as user." });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y ngÆ°á»i dÃ¹ng." });
    }

    // Kiá»ƒm tra tráº¡ng thÃ¡i tÃ i khoáº£n
    if (targetUser.status === "blocked") {
      return res.status(403).json({
        message: "TÃ i khoáº£n nÃ y Ä‘Ã£ bá»‹ khÃ³a.",
      });
    }

    // Táº¡o JWT token cho user Ä‘Ã³ (giá»‘ng nhÆ° login bÃ¬nh thÆ°á»ng)
    const payload = {
      id: targetUser._id,
      name: targetUser.name,
      role: targetUser.role,
    };

    const token = jwt.sign(
      payload,
      getJwtSecret(),
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: `ÄÄƒng nháº­p thÃ nh cÃ´ng vá»›i tÃ i khoáº£n ${targetUser.email}`,
      token: `Bearer ${token}`,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        avatar: targetUser.avatar
      },
      impersonated: true, // Flag Ä‘á»ƒ biáº¿t Ä‘Ã¢y lÃ  login as user
      originalAdminId: req.user.id // LÆ°u ID admin gá»‘c Ä‘á»ƒ cÃ³ thá»ƒ quay láº¡i
    });
  } catch (error) {
    res.status(500).json({ message: "Lá»—i server khi login as user", error: error.message });
  }
};

// ðŸŸ¢ Admin: Láº¥y sá»‘ dÆ° vÃ­ cá»§a user (chá»‰ Admin)
const getUserWalletBalance = async (req, res) => {
  try {
    // Chá»‰ admin má»›i Ä‘Æ°á»£c xem balance
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chá»‰ admin má»›i Ä‘Æ°á»£c xem sá»‘ dÆ° vÃ­." });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y ngÆ°á»i dÃ¹ng." });
    }

    // TÃ¬m hoáº·c táº¡o wallet cho user
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
    res.status(500).json({ message: "Lá»—i server khi láº¥y sá»‘ dÆ° vÃ­", error: error.message });
  }
};

// ðŸŸ¢ Admin: Cáº­p nháº­t sá»‘ dÆ° vÃ­ cá»§a user (chá»‰ Admin) - cÃ³ thá»ƒ cá»™ng hoáº·c trá»«
const updateUserWalletBalance = async (req, res) => {
  try {
    // Chá»‰ admin má»›i Ä‘Æ°á»£c cáº­p nháº­t balance
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chá»‰ admin má»›i Ä‘Æ°á»£c cáº­p nháº­t sá»‘ dÆ° vÃ­." });
    }

    const { amount, operation } = req.body; // operation: 'add' hoáº·c 'subtract'
    const userId = req.params.id;

    if (!amount || isNaN(amount)) {
      return res.status(400).json({ message: "Sá»‘ tiá»n khÃ´ng há»£p lá»‡." });
    }

    if (!['add', 'subtract'].includes(operation)) {
      return res.status(400).json({ message: "Operation pháº£i lÃ  'add' hoáº·c 'subtract'." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y ngÆ°á»i dÃ¹ng." });
    }

    // TÃ¬m hoáº·c táº¡o wallet cho user
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
          message: `Sá»‘ dÆ° hiá»‡n táº¡i (${oldBalance}) khÃ´ng Ä‘á»§ Ä‘á»ƒ trá»« ${amountNum}.` 
        });
      }
      wallet.balance -= amountNum;
    }

    await wallet.save();

    res.status(200).json({
      message: `ÄÃ£ ${operation === 'add' ? 'cá»™ng' : 'trá»«'} ${amountNum} vÃ o vÃ­ cá»§a ${user.email}`,
      userId: user._id,
      email: user.email,
      name: user.name,
      oldBalance,
      newBalance: wallet.balance,
      operation,
      amount: amountNum
    });
  } catch (error) {
    res.status(500).json({ message: "Lá»—i server khi cáº­p nháº­t sá»‘ dÆ° vÃ­", error: error.message });
  }
};

// ðŸŸ¢ Admin: XÃ³a lá»‹ch sá»­ mua hÃ ng cá»§a user (chá»‰ Admin) - Hard delete (giá»¯ láº¡i Ä‘á»ƒ tÆ°Æ¡ng thÃ­ch)
const deleteUserOrderHistory = async (req, res) => {
  try {
    // Chá»‰ admin má»›i Ä‘Æ°á»£c xÃ³a lá»‹ch sá»­ mua hÃ ng
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chá»‰ admin má»›i Ä‘Æ°á»£c xÃ³a lá»‹ch sá»­ mua hÃ ng." });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y ngÆ°á»i dÃ¹ng." });
    }

    const Order = require("../models/order");
    const result = await Order.deleteMany({ user: user._id });

    res.status(200).json({
      message: `ÄÃ£ xÃ³a ${result.deletedCount} Ä‘Æ¡n hÃ ng cá»§a ${user.email}`,
      userId: user._id,
      email: user.email,
      name: user.name,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ message: "Lá»—i server khi xÃ³a lá»‹ch sá»­ mua hÃ ng", error: error.message });
  }
};

// ðŸŸ¢ Admin: Láº¥y Ä‘Æ¡n hÃ ng cá»§a user (chá»‰ Admin) - cÃ³ thá»ƒ filter theo status
const getUserOrders = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chá»‰ admin má»›i Ä‘Æ°á»£c xem Ä‘Æ¡n hÃ ng cá»§a user." });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y ngÆ°á»i dÃ¹ng." });
    }

    const Order = require("../models/order");
    const { status, includeDeleted } = req.query;
    
    let query = { user: user._id };
    
    // Filter theo status náº¿u cÃ³
    if (status) {
      query.status = status;
    }
    
    // Bao gá»“m Ä‘Æ¡n hÃ ng Ä‘Ã£ xÃ³a náº¿u includeDeleted=true
    // Sá»­ dá»¥ng $ne: true Ä‘á»ƒ match cáº£ document cÅ© khÃ´ng cÃ³ trÆ°á»ng isDeleted
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
    res.status(500).json({ message: "Lá»—i server khi láº¥y Ä‘Æ¡n hÃ ng", error: error.message });
  }
};

// ðŸŸ¢ Admin: Láº¥y lá»‹ch sá»­ thanh toÃ¡n (transactions) cá»§a user (chá»‰ Admin)
const getUserTransactions = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chá»‰ admin má»›i Ä‘Æ°á»£c xem lá»‹ch sá»­ thanh toÃ¡n cá»§a user." });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y ngÆ°á»i dÃ¹ng." });
    }

    const Transaction = require("../models/transaction");
    const { status, includeDeleted } = req.query;
    
    let query = { user: user._id };
    
    // Filter theo status náº¿u cÃ³
    if (status) {
      query.status = status;
    }
    
    // Bao gá»“m transaction Ä‘Ã£ xÃ³a náº¿u includeDeleted=true
    // Sá»­ dá»¥ng $ne: true Ä‘á»ƒ match cáº£ document cÅ© khÃ´ng cÃ³ trÆ°á»ng isDeleted
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
    res.status(500).json({ message: "Lá»—i server khi láº¥y lá»‹ch sá»­ thanh toÃ¡n", error: error.message });
  }
};

// ðŸŸ¢ Admin: XÃ³a má»m Ä‘Æ¡n hÃ ng (chá»‰ Admin)
const softDeleteOrder = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chá»‰ admin má»›i Ä‘Æ°á»£c xÃ³a Ä‘Æ¡n hÃ ng." });
    }

    const Order = require("../models/order");
    const order = await Order.findById(req.params.id); // Sá»­a tá»« orderId thÃ nh id
    
    if (!order) {
      return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n hÃ ng." });
    }

    if (order.isDeleted) {
      return res.status(400).json({ message: "ÄÆ¡n hÃ ng Ä‘Ã£ bá»‹ xÃ³a trÆ°á»›c Ä‘Ã³." });
    }

    order.isDeleted = true;
    order.deletedAt = new Date();
    order.deletedBy = req.user._id;
    await order.save();

    res.status(200).json({
      message: "ÄÃ£ xÃ³a Ä‘Æ¡n hÃ ng thÃ nh cÃ´ng",
      order
    });
  } catch (error) {
    res.status(500).json({ message: "Lá»—i server khi xÃ³a Ä‘Æ¡n hÃ ng", error: error.message });
  }
};

// ðŸŸ¢ Admin: KhÃ´i phá»¥c Ä‘Æ¡n hÃ ng (chá»‰ Admin)
const restoreOrder = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chá»‰ admin má»›i Ä‘Æ°á»£c khÃ´i phá»¥c Ä‘Æ¡n hÃ ng." });
    }

    const Order = require("../models/order");
    const order = await Order.findById(req.params.id); // Sá»­a tá»« orderId thÃ nh id
    
    if (!order) {
      return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n hÃ ng." });
    }

    if (!order.isDeleted) {
      return res.status(400).json({ message: "ÄÆ¡n hÃ ng chÆ°a bá»‹ xÃ³a." });
    }

    order.isDeleted = false;
    order.deletedAt = null;
    order.deletedBy = null;
    await order.save();

    res.status(200).json({
      message: "ÄÃ£ khÃ´i phá»¥c Ä‘Æ¡n hÃ ng thÃ nh cÃ´ng",
      order
    });
  } catch (error) {
    res.status(500).json({ message: "Lá»—i server khi khÃ´i phá»¥c Ä‘Æ¡n hÃ ng", error: error.message });
  }
};

// ðŸŸ¢ Admin: XÃ³a má»m transaction (chá»‰ Admin)
const softDeleteTransaction = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chá»‰ admin má»›i Ä‘Æ°á»£c xÃ³a giao dá»‹ch." });
    }

    const Transaction = require("../models/transaction");
    const transaction = await Transaction.findById(req.params.id); // Sá»­a tá»« transactionId thÃ nh id
    
    if (!transaction) {
      return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y giao dá»‹ch." });
    }

    if (transaction.isDeleted) {
      return res.status(400).json({ message: "Giao dá»‹ch Ä‘Ã£ bá»‹ xÃ³a trÆ°á»›c Ä‘Ã³." });
    }

    transaction.isDeleted = true;
    transaction.deletedAt = new Date();
    transaction.deletedBy = req.user._id;
    await transaction.save();

    res.status(200).json({
      message: "ÄÃ£ xÃ³a giao dá»‹ch thÃ nh cÃ´ng",
      transaction
    });
  } catch (error) {
    res.status(500).json({ message: "Lá»—i server khi xÃ³a giao dá»‹ch", error: error.message });
  }
};

// ðŸŸ¢ Admin: KhÃ´i phá»¥c transaction (chá»‰ Admin)
const restoreTransaction = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chá»‰ admin má»›i Ä‘Æ°á»£c khÃ´i phá»¥c giao dá»‹ch." });
    }

    const Transaction = require("../models/transaction");
    const transaction = await Transaction.findById(req.params.id); // Sá»­a tá»« transactionId thÃ nh id
    
    if (!transaction) {
      return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y giao dá»‹ch." });
    }

    if (!transaction.isDeleted) {
      return res.status(400).json({ message: "Giao dá»‹ch chÆ°a bá»‹ xÃ³a." });
    }

    transaction.isDeleted = false;
    transaction.deletedAt = null;
    transaction.deletedBy = null;
    await transaction.save();

    res.status(200).json({
      message: "ÄÃ£ khÃ´i phá»¥c giao dá»‹ch thÃ nh cÃ´ng",
      transaction
    });
  } catch (error) {
    res.status(500).json({ message: "Lá»—i server khi khÃ´i phá»¥c giao dá»‹ch", error: error.message });
  }
};

// ðŸŸ¢ Admin: Promote user lÃªn admin (chá»‰ Admin)
const promoteUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chá»‰ admin má»›i Ä‘Æ°á»£c promote user." });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y ngÆ°á»i dÃ¹ng." });
    }

    // KhÃ´ng cho phÃ©p promote chÃ­nh mÃ¬nh
    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Báº¡n khÃ´ng thá»ƒ promote chÃ­nh mÃ¬nh." });
    }

    // Kiá»ƒm tra user Ä‘Ã£ lÃ  admin chÆ°a
    if (targetUser.role === 'admin') {
      return res.status(400).json({ message: "NgÆ°á»i dÃ¹ng nÃ y Ä‘Ã£ lÃ  admin." });
    }

    targetUser.role = 'admin';
    await targetUser.save();

    res.status(200).json({
      message: `ÄÃ£ promote ${targetUser.email} lÃªn admin thÃ nh cÃ´ng`,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Lá»—i server khi promote user", error: error.message });
  }
};

// ðŸŸ¢ Admin: Demote admin vá» customer (chá»‰ Admin)
const demoteUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Chá»‰ admin má»›i Ä‘Æ°á»£c demote user." });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y ngÆ°á»i dÃ¹ng." });
    }

    // KhÃ´ng cho phÃ©p demote chÃ­nh mÃ¬nh
    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Báº¡n khÃ´ng thá»ƒ demote chÃ­nh mÃ¬nh." });
    }

    // Kiá»ƒm tra user Ä‘Ã£ lÃ  customer chÆ°a
    if (targetUser.role === 'customer') {
      return res.status(400).json({ message: "NgÆ°á»i dÃ¹ng nÃ y Ä‘Ã£ lÃ  customer." });
    }

    targetUser.role = 'customer';
    await targetUser.save();

    res.status(200).json({
      message: `ÄÃ£ demote ${targetUser.email} vá» customer thÃ nh cÃ´ng`,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Lá»—i server khi demote user", error: error.message });
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
