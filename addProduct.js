const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load Models
const Product = require("./src/models/product");

dotenv.config();

// Connect DB
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/telepremium")
  .then(() => console.log("DB Connected"))
  .catch(err => console.error(err));

const addProduct = async () => {
    try {
        // Kiểm tra xem sản phẩm đã tồn tại chưa
        const existingProduct = await Product.findOne({ 
            name: "Clone Telegram",
            price: 65000
        });

        if (existingProduct) {
            console.log("Sản phẩm 'Clone Telegram' đã tồn tại trong database!");
            process.exit(0);
        }

        // Thêm sản phẩm mới
        const newProduct = await Product.create({
            name: "Clone Telegram",
            description: "Tài khoản Telegram clone chất lượng, đầy đủ thông tin, sử dụng ổn định.",
            price: 65000,
            duration_months: 1,
            features: ["Clone chất lượng", "Full thông tin", "Bảo hành 24h", "Sử dụng ổn định"],
            image: "https://cdn-icons-png.flaticon.com/512/2111/2111646.png",
            category: "DICH_VU_MXH",
            isActive: true
        });

        console.log("✅ Đã thêm sản phẩm mới thành công!");
        console.log("Sản phẩm:", newProduct);
        process.exit(0);
    } catch (error) {
        console.error("❌ Lỗi khi thêm sản phẩm:", error);
        process.exit(1);
    }
};

addProduct();

