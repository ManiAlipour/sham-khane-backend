const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");
const { body } = require("express-validator");

const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  updateProfile,
} = require("../controllers/user.controller");

// Validation middleware
const userUpdateValidation = [
  body("name")
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("email")
    .optional()
    .isEmail()
    .withMessage("Please include a valid email"),
  body("phoneNumber")
    .optional()
    .isLength({ max: 20 })
    .withMessage("Phone number cannot be longer than 20 characters"),
  body("address.street").optional(),
  body("address.city").optional(),
  body("address.state").optional(),
  body("address.zipCode").optional(),
  body("address.country").optional(),
];

// Admin routes
router.use(protect);
router.route("/").get(authorize("admin"), getUsers);

router
  .route("/:id")
  .get(authorize("admin"), getUser)
  .put(authorize("admin"), userUpdateValidation, updateUser)
  .delete(authorize("admin"), deleteUser);

// User profile route
router.put("/profile/update", userUpdateValidation, updateProfile);

module.exports = router;
