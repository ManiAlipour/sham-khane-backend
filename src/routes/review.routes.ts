const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth.middleware");
const { body } = require("express-validator");

const {
  getReviews,
  getReview,
  addReview,
  updateReview,
  deleteReview,
  getProductReviews,
} = require("../controllers/review.controller");

// Validation middleware
const reviewValidation = [
  body("rating")
    .notEmpty()
    .withMessage("Rating is required")
    .isFloat({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),
  body("comment")
    .notEmpty()
    .withMessage("Comment is required")
    .isLength({ min: 10, max: 1000 })
    .withMessage("Comment must be between 10 and 1000 characters"),
];

router.route("/").get(getReviews).post(protect, reviewValidation, addReview);

router
  .route("/:id")
  .get(getReview)
  .put(protect, reviewValidation, updateReview)
  .delete(protect, deleteReview);

router.route("/product/:productId").get(getProductReviews);

module.exports = router;
