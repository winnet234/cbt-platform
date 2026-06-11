const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const { validateCreateQuestion } = require('../middleware/validators');
const {
  createQuestion,
  getAllQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  bulkUploadQuestions,
  getQuestionsByExam
} = require('../controllers/questionController');

// Public routes - Get all active questions
router.get('/', getAllQuestions);

// Get questions by exam ID
router.get('/exam/:examId', getQuestionsByExam);

// Protected routes - Require authentication
router.post('/', auth, roleAuth('lecturer', 'admin', 'super_admin'), validateCreateQuestion, createQuestion);

// Bulk upload questions
router.post('/exam/:examId/bulk-upload', auth, roleAuth('lecturer', 'admin', 'super_admin'), bulkUploadQuestions);

// Get question by ID
router.get('/:id', getQuestionById);

// Update question - Only creator or admin
router.put('/:id', auth, roleAuth('lecturer', 'admin', 'super_admin'), updateQuestion);

// Delete question - Only creator or admin
router.delete('/:id', auth, roleAuth('lecturer', 'admin', 'super_admin'), deleteQuestion);

module.exports = router;
