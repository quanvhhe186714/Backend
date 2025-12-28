const express = require("express");
const router = express.Router();
const {
  getAllCategories,
  getAllCategoriesAdmin,
  createCategory,
  updateCategory,
  deleteCategory
} = require("../controllers/categoryController");
const { protect, isAdmin } = require("../middleware/authMiddleware");

// Public: Get all active categories
router.get("/", getAllCategories);

// Admin: Get all categories (including inactive)
router.get("/admin", protect, isAdmin, getAllCategoriesAdmin);

// Admin: Create category
router.post("/", protect, isAdmin, createCategory);

// Admin: Update category
router.put("/:id", protect, isAdmin, updateCategory);

// Admin: Delete category
router.delete("/:id", protect, isAdmin, deleteCategory);

module.exports = router;

