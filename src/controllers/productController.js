const Product = require("../models/product");
const Category = require("../models/category");
const Review = require("../models/review");

const buildRatingMap = async (field, ids) => {
  const summaries = await Review.aggregate([
    { $match: { [field]: { $in: ids } } },
    {
      $group: {
        _id: `$${field}`,
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
        totalUsers: { $addToSet: "$user" },
      },
    },
    {
      $project: {
        averageRating: { $round: ["$averageRating", 1] },
        totalReviews: 1,
        totalUsers: { $size: "$totalUsers" },
      },
    },
  ]);

  return summaries.reduce((map, item) => {
    map[item._id.toString()] = {
      averageRating: item.averageRating || 0,
      totalReviews: item.totalReviews || 0,
      totalUsers: item.totalUsers || 0,
    };
    return map;
  }, {});
};

// Public: Get all products
const getAllProducts = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { isActive: true };
    if (category) {
      filter.category = category.toUpperCase();
    }
    const products = await Product.find(filter).sort({ price: 1 }).lean();
    const ratingMap = await buildRatingMap(
      "product",
      products.map((product) => product._id)
    );
    const productsWithRatings = products.map((product) => ({
      ...product,
      ratingSummary: ratingMap[product._id.toString()] || {
        averageRating: 0,
        totalReviews: 0,
        totalUsers: 0,
      },
    }));
    res.status(200).json(productsWithRatings);
  } catch (error) {
    res.status(500).json({ message: "Error fetching products", error: error.message });
  }
};

// Public: Get product by id
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || !product.isActive) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: "Error fetching product", error: error.message });
  }
};

// Admin: Create Product
const createProduct = async (req, res) => {
  try {
    // Validate category if provided
    if (req.body.category) {
      const categoryCode = req.body.category.toUpperCase();
      const category = await Category.findOne({ code: categoryCode, isActive: true });
      if (!category) {
        return res.status(400).json({ 
          message: `Category "${categoryCode}" does not exist or is inactive` 
        });
      }
      req.body.category = categoryCode;
    } else {
      // Default to OTHER if not provided
      req.body.category = "OTHER";
    }

    const newProduct = new Product(req.body);
    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(500).json({ message: "Error creating product", error: error.message });
  }
};

// Admin: Update Product
const updateProduct = async (req, res) => {
  try {
    // Validate category if provided
    if (req.body.category) {
      const categoryCode = req.body.category.toUpperCase();
      const category = await Category.findOne({ code: categoryCode, isActive: true });
      if (!category) {
        return res.status(400).json({ 
          message: `Category "${categoryCode}" does not exist or is inactive` 
        });
      }
      req.body.category = categoryCode;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    if (!updatedProduct) return res.status(404).json({ message: "Product not found" });
    res.status(200).json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: "Error updating product", error: error.message });
  }
};

// Admin: Delete Product
const deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting product", error: error.message });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};

