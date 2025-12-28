const Category = require("../models/category");
const Product = require("../models/product");

// Public: Get all active categories
const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ order: 1, name: 1 });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: "Error fetching categories", error: error.message });
  }
};

// Admin: Get all categories (including inactive)
const getAllCategoriesAdmin = async (req, res) => {
  try {
    const categories = await Category.find()
      .sort({ order: 1, name: 1 });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: "Error fetching categories", error: error.message });
  }
};

// Admin: Create Category
const createCategory = async (req, res) => {
  try {
    const { code, name, order, isActive } = req.body;
    
    // Validate required fields
    if (!code || !name) {
      return res.status(400).json({ message: "Code and name are required" });
    }

    // Check if category with same code already exists
    const existingCategory = await Category.findOne({ code: code.toUpperCase() });
    if (existingCategory) {
      return res.status(400).json({ message: "Category with this code already exists" });
    }

    const newCategory = new Category({
      code: code.toUpperCase(),
      name,
      order: order || 0,
      isActive: isActive !== undefined ? isActive : true
    });

    const savedCategory = await newCategory.save();
    res.status(201).json(savedCategory);
  } catch (error) {
    res.status(500).json({ message: "Error creating category", error: error.message });
  }
};

// Admin: Update Category
const updateCategory = async (req, res) => {
  try {
    const { code, name, order, isActive } = req.body;
    const categoryId = req.params.id;

    const updateData = {};
    if (code !== undefined) updateData.code = code.toUpperCase();
    if (name !== undefined) updateData.name = name;
    if (order !== undefined) updateData.order = order;
    if (isActive !== undefined) updateData.isActive = isActive;

    // If updating code, check for duplicates
    if (code) {
      const existingCategory = await Category.findOne({ 
        code: code.toUpperCase(),
        _id: { $ne: categoryId }
      });
      if (existingCategory) {
        return res.status(400).json({ message: "Category with this code already exists" });
      }
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json(updatedCategory);
  } catch (error) {
    res.status(500).json({ message: "Error updating category", error: error.message });
  }
};

// Admin: Delete Category
const deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Find the category to get its code
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Find or create "OTHER" category
    let otherCategory = await Category.findOne({ code: "OTHER" });
    if (!otherCategory) {
      otherCategory = new Category({
        code: "OTHER",
        name: "Khác",
        order: 999,
        isActive: true
      });
      await otherCategory.save();
    }

    // Move all products from this category to "OTHER"
    await Product.updateMany(
      { category: category.code },
      { category: "OTHER" }
    );

    // Delete the category
    await Category.findByIdAndDelete(categoryId);

    res.status(200).json({ 
      message: "Category deleted successfully. Products moved to OTHER category." 
    });
  } catch (error) {
    res.status(500).json({ message: "Error deleting category", error: error.message });
  }
};

module.exports = {
  getAllCategories,
  getAllCategoriesAdmin,
  createCategory,
  updateCategory,
  deleteCategory
};

