const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { body } = require('express-validator');

const {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    applyDiscount
} = require('../controllers/cart.controller');

// Validation middleware
const cartItemValidation = [
    body('productId')
        .notEmpty()
        .withMessage('Product ID is required'),
    body('quantity')
        .notEmpty()
        .withMessage('Quantity is required')
        .isInt({ min: 1 })
        .withMessage('Quantity must be at least 1')
];

const discountValidation = [
    body('code')
        .notEmpty()
        .withMessage('Discount code is required')
];

router.use(protect); // All cart routes require authentication

router.get('/', getCart);
router.post('/items', cartItemValidation, addToCart);
router.put('/items/:itemId', cartItemValidation, updateCartItem);
router.delete('/items/:itemId', removeFromCart);
router.delete('/', clearCart);
router.post('/discount', discountValidation, applyDiscount);

module.exports = router; 