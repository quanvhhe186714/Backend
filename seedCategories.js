const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load Models
const Category = require("./src/models/category");

dotenv.config();

// Connect DB
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/telepremium")
  .then(() => console.log("DB Connected"))
  .catch(err => console.error(err));

const seedCategories = async () => {
    try {
        console.log("Starting category migration...");

        // Check if categories already exist
        const existingCategories = await Category.find();
        if (existingCategories.length > 0) {
            console.log("Categories already exist. Skipping migration.");
            process.exit(0);
            return;
        }

        // Create default categories
        const categories = await Category.insertMany([
            {
                code: "VIA",
                name: "VIA",
                order: 1,
                isActive: true
            },
            {
                code: "PROXY",
                name: "PROXY",
                order: 2,
                isActive: true
            },
            {
                code: "DICH_VU_MXH",
                name: "Dịch vụ MXH hoàn chỉnh",
                order: 3,
                isActive: true
            },
            {
                code: "OTHER",
                name: "Khác",
                order: 999,
                isActive: true
            }
        ]);

        console.log(`✅ Created ${categories.length} categories:`);
        categories.forEach(cat => {
            console.log(`   - ${cat.code}: ${cat.name}`);
        });

        console.log("✅ Category migration completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding categories:", error);
        process.exit(1);
    }
};

seedCategories();

