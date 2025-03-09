const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth.middleware");
const { body } = require("express-validator");

const {
  getOrders,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,
  getUserOrders,
} = require("../controllers/order.controller");

// Validation middleware
const orderValidation = [
  body("items").isArray().withMessage("Items must be an array"),
  body("items.*.product").notEmpty().withMessage("Product ID is required"),
  body("items.*.quantity")
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),
  body("shippingAddress").notEmpty().withMessage("Shipping address is required"),
];

// Routes
router
  .route("/")
  .get(protect, getOrders)
  .post(protect, orderValidation, createOrder);

router
  .route("/:id")
  .get(protect, getOrder)
  .put(protect, updateOrder)
  .delete(protect, deleteOrder);

router.route("/user/me").get(protect, getUserOrders);

module.exports = router; 