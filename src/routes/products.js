const express = require("express");
const router = express.Router();
const { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct } = require("../controllers/productController");
const { protect, isAdmin } = require("../middleware/authMiddleware");

router.get("/", getAllProducts);
router.get("/:id", getProductById);
router.post("/", protect, isAdmin, createProduct); 
router.put("/:id", protect, isAdmin, updateProduct);
router.delete("/:id", protect, isAdmin, deleteProduct);

module.exports = router;

