const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

// Load Models
const User = require("./src/models/users");
const Product = require("./src/models/product");
const Order = require("./src/models/order");
const Coupon = require("./src/models/coupon");

dotenv.config();

// Connect DB
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/telepremium")
  .then(() => console.log("DB Connected"))
  .catch(err => console.error(err));

const seedData = async () => {
    try {
        // Clear DB
        await User.deleteMany({});
        await Product.deleteMany({});
        await Order.deleteMany({});
        await Coupon.deleteMany({});
        console.log("Data cleared");

        // 1. Create Users
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash("123456", salt);

        const admin = await User.create({
            name: "Admin User",
            email: "admin@gmail.com",
            password: hashedPassword,
            role: "admin",
            status: "active"
        });

        const user = await User.create({
            name: "Test User",
            email: "user@gmail.com",
            password: hashedPassword,
            role: "customer",
            status: "active"
        });
        console.log("Users created");

        // 2. Create Products
        const products = await Product.insertMany([
            {
                name: "Premium 1 Month",
                description: "Experience Telegram at its best for 1 month.",
                price: 4.99,
                duration_months: 1,
                features: ["Double Limits", "4 GB Uploads", "Faster Download", "No Ads"],
                image: "https://cdn-icons-png.flaticon.com/512/2111/2111646.png"
            },
            {
                name: "Premium 3 Months",
                description: "Quarterly plan for dedicated users.",
                price: 13.99,
                duration_months: 3,
                features: ["Double Limits", "4 GB Uploads", "Faster Download", "No Ads", "Unique Reactions"],
                image: "https://cdn-icons-png.flaticon.com/512/2111/2111646.png"
            },
            {
                name: "Premium 6 Months",
                description: "Half-year access with great savings.",
                price: 24.99,
                duration_months: 6,
                features: ["Double Limits", "4 GB Uploads", "Faster Download", "No Ads", "Premium Stickers", "Animated Emoji Status"],
                image: "https://cdn-icons-png.flaticon.com/512/2111/2111646.png"
            },
            {
                name: "Premium 1 Year",
                description: "Best value. 365 days of premium features.",
                price: 39.99,
                duration_months: 12,
                features: ["All Premium Features", "Voice-to-Text", "Advanced Chat Management", "Profile Badge", "Animated Profile Pictures"],
                image: "https://cdn-icons-png.flaticon.com/512/2111/2111646.png"
            }
        ]);
        console.log("Products created");

        // 3. Create Coupons
        await Coupon.create({
            code: "WELCOME",
            discountType: "percent",
            discountValue: 10,
            expirationDate: new Date("2025-12-31"),
            usageLimit: 1000
        });
        await Coupon.create({
            code: "SAVE5",
            discountType: "amount",
            discountValue: 5,
            minOrderValue: 20,
            expirationDate: new Date("2025-12-31"),
            usageLimit: 50
        });
        console.log("Coupons created");

        // 4. Create Orders
        await Order.create([
            {
                user: user._id,
                items: [{
                    product: products[0]._id,
                    name: products[0].name,
                    price: products[0].price,
                    quantity: 1
                }],
                totalAmount: products[0].price,
                subTotal: products[0].price,
                status: "completed",
                createdAt: new Date("2023-10-01")
            },
            {
                user: user._id,
                items: [{
                    product: products[3]._id, // 1 Year
                    name: products[3].name,
                    price: products[3].price,
                    quantity: 1
                }],
                totalAmount: products[3].price,
                subTotal: products[3].price,
                status: "pending",
                createdAt: new Date()
            }
        ]);
        console.log("Orders created");

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seedData();

