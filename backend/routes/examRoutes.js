const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const { validateCreateExam } = require('../middleware/validators');
const {
  createExam,
  getAllExams,
  getExamById,
  updateExam,
  publishExam,
  deleteExam,
  addQuestionsToExam,
  getExamStatistics
} = require('../controllers/examController');

// Public routes - Get all published exams
router.get('/', getAllExams);

// Protected routes - Require authentication
router.post('/', auth, roleAuth('lecturer', 'admin', 'super_admin'), validateCreateExam, createExam);

// Get exam by ID
router.get('/:id', getExamById);

// Update exam - Only lecturer who created it or admin
router.put('/:id', auth, roleAuth('lecturer', 'admin', 'super_admin'), updateExam);

// Publish exam - Only lecturer who created it or admin
router.post('/:id/publish', auth, roleAuth('lecturer', 'admin', 'super_admin'), publishExam);

// Delete exam - Only lecturer who created it or admin
router.delete('/:id', auth, roleAuth('lecturer', 'admin', 'super_admin'), deleteExam);

// Add questions to exam
router.post('/:id/add-questions', auth, roleAuth('lecturer', 'admin', 'super_admin'), addQuestionsToExam);

// Get exam statistics
router.get('/:id/statistics', auth, roleAuth('lecturer', 'admin', 'super_admin'), getExamStatistics);

module.exports = router;
