const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const {
  createNotification,
  getUserNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  sendBulkNotifications,
  getUnreadCount
} = require('../controllers/notificationController');

// Protected routes - Require authentication
// Get user notifications
router.get('/', auth, getUserNotifications);

// Get unread notification count
router.get('/unread-count', auth, getUnreadCount);

// Get notification by ID
router.get('/:id', auth, getNotificationById);

// Mark notification as read
router.put('/:id/read', auth, markAsRead);

// Mark all notifications as read
router.put('/read-all', auth, markAllAsRead);

// Delete notification
router.delete('/:id', auth, deleteNotification);

// Delete all notifications
router.delete('/', auth, deleteAllNotifications);

// Admin routes
// Create notification (Admin/Super Admin only)
router.post('/', auth, roleAuth('admin', 'super_admin'), createNotification);

// Send bulk notifications (Admin/Super Admin only)
router.post('/bulk/send', auth, roleAuth('admin', 'super_admin'), sendBulkNotifications);

module.exports = router;
