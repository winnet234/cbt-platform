const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const {
  submitExam,
  getResultById,
  getStudentResults,
  getExamResults,
  getExamResultsStatistics,
  getStudentExamResult
} = require('../controllers/resultController');

// Protected routes - Require authentication
// Submit exam (Students only)
router.post('/submit', auth, roleAuth('student'), submitExam);

// Get student's results
router.get('/my-results', auth, roleAuth('student'), getStudentResults);

// Get student's result for specific exam
router.get('/exam/:examId', auth, roleAuth('student'), getStudentExamResult);

// Get result by ID
router.get('/:id', auth, getResultById);

// Get all results for an exam (Lecturer/Admin only)
router.get('/exam/:examId/all-results', auth, roleAuth('lecturer', 'admin', 'super_admin'), getExamResults);

// Get exam results statistics (Lecturer/Admin only)
router.get('/exam/:examId/statistics', auth, roleAuth('lecturer', 'admin', 'super_admin'), getExamResultsStatistics);

module.exports = router;
