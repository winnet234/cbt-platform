const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const {
  getUserProfile,
  updateUserProfile,
  changePassword,
  getAllUsers,
  getUserById,
  updateUserStatus,
  enrollInCourse,
  unenrollFromCourse
} = require('../controllers/userController');

// Protected routes - Require authentication
// Get current user profile
router.get('/profile', auth, getUserProfile);

// Update current user profile
router.put('/profile', auth, updateUserProfile);

// Change password
router.post('/change-password', auth, changePassword);

// Enroll in course
router.post('/enroll', auth, roleAuth('student'), enrollInCourse);

// Unenroll from course
router.post('/unenroll', auth, roleAuth('student'), unenrollFromCourse);

// Admin routes
// Get all users (Admin/Super Admin only)
router.get('/', auth, roleAuth('admin', 'super_admin'), getAllUsers);

// Get user by ID (Admin/Super Admin only)
router.get('/:id', auth, roleAuth('admin', 'super_admin'), getUserById);

// Update user status (Admin/Super Admin only)
router.put('/:id/status', auth, roleAuth('admin', 'super_admin'), updateUserStatus);

module.exports = router;
