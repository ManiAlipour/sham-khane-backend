const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");
const { body } = require("express-validator");

const {
  getDiscounts,
  getDiscount,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  validateDiscount,
} = require("../controllers/discount.controller");

// Validation middleware
const discountValidation = [
  body("code")
    .notEmpty()
    .withMessage("Discount code is required")
    .isLength({ min: 3, max: 20 })
    .withMessage("Code must be between 3 and 20 characters"),
  body("description").notEmpty().withMessage("Description is required"),
  body("type")
    .notEmpty()
    .withMessage("Type is required")
    .isIn(["percentage", "fixed"])
    .withMessage("Invalid discount type"),
  body("value")
    .notEmpty()
    .withMessage("Value is required")
    .isFloat({ min: 0 })
    .withMessage("Value must be greater than 0"),
  body("expiryDate")
    .notEmpty()
    .withMessage("Expiry date is required")
    .isISO8601()
    .withMessage("Invalid date format"),
];

router
  .route("/")
  .get(protect, authorize("admin"), getDiscounts)
  .post(protect, authorize("admin"), discountValidation, createDiscount);

router
  .route("/:id")
  .get(protect, authorize("admin"), getDiscount)
  .put(protect, authorize("admin"), discountValidation, updateDiscount)
  .delete(protect, authorize("admin"), deleteDiscount);

router.post("/validate", protect, validateDiscount);

module.exports = router;
