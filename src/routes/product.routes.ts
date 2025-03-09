const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");
const { body } = require("express-validator");

const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImages,
  searchProducts,
  getFeaturedProducts,
} = require("../controllers/product.controller");

// Validation middleware
const productValidation = [
  body("name")
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 100 })
    .withMessage("Name cannot be more than 100 characters"),
  body("description")
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ max: 2000 })
    .withMessage("Description cannot be more than 2000 characters"),
  body("price")
    .notEmpty()
    .withMessage("Price is required")
    .isFloat({ min: 0 })
    .withMessage("Price must be greater than 0"),
  body("category")
    .notEmpty()
    .withMessage("Category is required")
    .isIn([
      "Electronics",
      "Clothing",
      "Books",
      "Home",
      "Beauty",
      "Sports",
      "Other",
    ])
    .withMessage("Invalid category"),
  body("stock")
    .notEmpty()
    .withMessage("Stock is required")
    .isInt({ min: 0 })
    .withMessage("Stock must be greater than or equal to 0"),
  body("brand").notEmpty().withMessage("Brand is required"),
];

router
  .route("/")
  .get(getProducts)
  .post(protect, authorize("admin"), productValidation, createProduct);

router
  .route("/:id")
  .get(getProduct)
  .put(protect, authorize("admin"), productValidation, updateProduct)
  .delete(protect, authorize("admin"), deleteProduct);

router.post("/:id/images", protect, authorize("admin"), uploadProductImages);

router.get("/search/:query", searchProducts);
router.get("/featured", getFeaturedProducts);

module.exports = router;
