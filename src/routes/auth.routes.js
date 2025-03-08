const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { body } = require('express-validator');

const {
    register,
    login,
    logout,
    getMe,
    forgotPassword,
    resetPassword,
    updatePassword,
    verifyEmail
} = require('../controllers/auth.controller');

// Validation middleware
const registerValidation = [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please include a valid email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters')
];

const loginValidation = [
    body('email').isEmail().withMessage('Please include a valid email'),
    body('password').exists().withMessage('Password is required')
];

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/logout', logout);
router.get('/me', protect, getMe);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);
router.put('/updatepassword', protect, updatePassword);
router.get('/verify-email/:token', verifyEmail);

module.exports = router; 