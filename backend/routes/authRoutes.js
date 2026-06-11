const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const { validateLogin, validateRegister, validateForgotPassword, validateResetPassword } = require('../middleware/validators');
const { register, login, refreshAccessToken, forgotPassword, resetPassword, logout } = require('../controllers/authController');

// Public routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/reset-password', validateResetPassword, resetPassword);
router.post('/refresh-token', refreshAccessToken);

// Protected routes
router.post('/logout', auth, logout);

module.exports = router;
