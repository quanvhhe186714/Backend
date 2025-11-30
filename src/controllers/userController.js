// controllers/userController.js
const User = require("../models/users");
const Wallet = require("../models/wallet");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
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

// 🟢 Upload avatar lên Cloudinary
const uploadAvatar = async (req, res) => {
  // Kiểm tra Cloudinary config
  if (!process.env.CLOUDINARY_NAME || !process.env.CLOUDINARY_KEY || !process.env.CLOUDINARY_SECRET) {
    console.error("❌ Cloudinary config missing!");
    return res.status(500).json({ 
      message: "Cloudinary configuration is missing. Please check environment variables.",
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

// 🟢 Lấy tất cả người dùng (chỉ Admin)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select("-password")
      .select("name email role status avatar");
    res.status(200).json(users);
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

module.exports = {
  registerUser,
  loginUser,
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
};
