const Result = require('../models/Result');
const Exam = require('../models/Exam');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// Submit exam and create result
const submitExam = async (req, res) => {
  try {
    const { examId, answers, timeSpent } = req.body;

    // Find exam
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Check if student already has a result
    let existingResult = await Result.findOne({
      student: req.userId,
      exam: examId
    });

    if (existingResult && exam.allowedAttempts && existingResult.attempt >= exam.allowedAttempts) {
      return res.status(400).json({
        success: false,
        message: `Maximum attempts (${exam.allowedAttempts}) reached for this exam`
      });
    }

    // Calculate marks
    let totalMarksObtained = 0;
    let correctAnswers = 0;
    const detailedAnswers = [];

    for (const answer of answers) {
      const question = exam.questions.find(q => q._id.toString() === answer.questionId);
      
      if (question) {
        let isCorrect = false;
        let marksForThisQuestion = 0;

        if (answer.selectedAnswer === question.correctAnswer) {
          isCorrect = true;
          marksForThisQuestion = question.marks || 1;
          correctAnswers += 1;
        } else if (exam.enableNegativeMarking) {
          marksForThisQuestion = -(question.negativeMarks || 0);
        }

        totalMarksObtained += marksForThisQuestion;

        detailedAnswers.push({
          question: question._id,
          selectedAnswer: answer.selectedAnswer,
          correctAnswer: question.correctAnswer,
          isCorrect,
          marksObtained: marksForThisQuestion
        });
      }
    }

    // Ensure marks don't go below 0
    totalMarksObtained = Math.max(0, totalMarksObtained);

    // Determine pass/fail status
    const status = totalMarksObtained >= exam.passMark ? 'pass' : 'fail';
    const percentage = ((totalMarksObtained / exam.totalMarks) * 100).toFixed(2);

    // Create or update result
    if (existingResult) {
      existingResult.attempt += 1;
      existingResult.totalMarksObtained = totalMarksObtained;
      existingResult.correctAnswers = correctAnswers;
      existingResult.wrongAnswers = answers.length - correctAnswers;
      existingResult.skippedQuestions = exam.totalQuestions - answers.length;
      existingResult.percentage = percentage;
      existingResult.status = status;
      existingResult.timeSpent = timeSpent;
      existingResult.detailedAnswers = detailedAnswers;
      existingResult.submittedAt = new Date();
      await existingResult.save();
    } else {
      const newResult = new Result({
        student: req.userId,
        exam: examId,
        subject: exam.subject,
        totalMarksObtained,
        correctAnswers,
        wrongAnswers: answers.length - correctAnswers,
        skippedQuestions: exam.totalQuestions - answers.length,
        percentage,
        status,
        timeSpent,
        detailedAnswers,
        attempt: 1,
        submittedAt: new Date()
      });

      await newResult.save();
      existingResult = newResult;
    }

    // Update exam statistics
    exam.totalStudentsCompleted = (exam.totalStudentsCompleted || 0) + 1;
    await exam.save();

    // Log action
    await AuditLog.create({
      user: req.userId,
      action: 'SUBMIT_EXAM',
      resource: 'Result',
      resourceId: existingResult._id,
      details: {
        examId,
        marks: totalMarksObtained,
        status,
        attempt: existingResult.attempt
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      message: 'Exam submitted successfully',
      result: {
        id: existingResult._id,
        totalMarksObtained,
        percentage,
        status,
        correctAnswers,
        wrongAnswers: answers.length - correctAnswers,
        attempt: existingResult.attempt,
        submittedAt: existingResult.submittedAt
      }
    });
  } catch (error) {
    console.error('Error submitting exam:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting exam',
      error: error.message
    });
  }
};

// Get result by ID
const getResultById = async (req, res) => {
  try {
    const result = await Result.findById(req.params.id)
      .populate('student', 'firstName lastName email')
      .populate('exam', 'examTitle examCode totalMarks passMark')
      .populate('subject', 'subjectCode subjectName')
      .populate('detailedAnswers.question', 'questionText marks');

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Result not found'
      });
    }

    // Check permissions - student can only see their own result, lecturers and admins can see all
    if (result.student._id.toString() !== req.userId && 
        req.user.role !== 'admin' && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this result'
      });
    }

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error fetching result:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching result',
      error: error.message
    });
  }
};

// Get all results for a student
const getStudentResults = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const results = await Result.find({ student: req.userId })
      .populate('exam', 'examTitle examCode')
      .populate('subject', 'subjectCode subjectName')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ submittedAt: -1 });

    const total = await Result.countDocuments({ student: req.userId });

    res.json({
      success: true,
      results,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching student results:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching results',
      error: error.message
    });
  }
};

// Get all results for an exam (Lecturer/Admin only)
const getExamResults = async (req, res) => {
  try {
    const { examId } = req.params;
    const { page = 1, limit = 10, sortBy = 'totalMarksObtained' } = req.query;

    // Find exam to verify ownership
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Check if user is exam creator or admin
    if (exam.lecturer.toString() !== req.userId && 
        req.user.role !== 'admin' && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view these results'
      });
    }

    const skip = (page - 1) * limit;
    const sortOrder = sortBy === 'totalMarksObtained' ? -1 : 1;

    const results = await Result.find({ exam: examId })
      .populate('student', 'firstName lastName email studentId')
      .populate('exam', 'examTitle examCode totalMarks')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ [sortBy]: sortOrder });

    const total = await Result.countDocuments({ exam: examId });

    res.json({
      success: true,
      results,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching exam results:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching exam results',
      error: error.message
    });
  }
};

// Get exam results statistics
const getExamResultsStatistics = async (req, res) => {
  try {
    const { examId } = req.params;

    // Find exam to verify ownership
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Check if user is exam creator or admin
    if (exam.lecturer.toString() !== req.userId && 
        req.user.role !== 'admin' && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view these statistics'
      });
    }

    const results = await Result.find({ exam: examId });
    const passedResults = results.filter(r => r.status === 'pass');
    const failedResults = results.filter(r => r.status === 'fail');

    const averageScore = results.length > 0
      ? (results.reduce((sum, r) => sum + r.totalMarksObtained, 0) / results.length).toFixed(2)
      : 0;

    const highestScore = results.length > 0
      ? Math.max(...results.map(r => r.totalMarksObtained))
      : 0;

    const lowestScore = results.length > 0
      ? Math.min(...results.map(r => r.totalMarksObtained))
      : 0;

    const averagePercentage = results.length > 0
      ? (results.reduce((sum, r) => sum + parseFloat(r.percentage), 0) / results.length).toFixed(2)
      : 0;

    const passPercentage = results.length > 0
      ? ((passedResults.length / results.length) * 100).toFixed(2)
      : 0;

    const averageTimeSpent = results.length > 0
      ? (results.reduce((sum, r) => sum + r.timeSpent, 0) / results.length).toFixed(0)
      : 0;

    res.json({
      success: true,
      statistics: {
        totalAttempts: results.length,
        totalPassed: passedResults.length,
        totalFailed: failedResults.length,
        averageScore,
        highestScore,
        lowestScore,
        averagePercentage,
        passPercentage,
        averageTimeSpent,
        totalQuestions: exam.totalQuestions,
        totalMarks: exam.totalMarks,
        passMark: exam.passMark
      }
    });
  } catch (error) {
    console.error('Error fetching exam statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching exam statistics',
      error: error.message
    });
  }
};

// Get student result for specific exam
const getStudentExamResult = async (req, res) => {
  try {
    const { examId } = req.params;

    const result = await Result.findOne({
      student: req.userId,
      exam: examId
    })
      .populate('exam', 'examTitle examCode totalMarks passMark showResults showCorrectAnswers')
      .populate('detailedAnswers.question', 'questionText marks correctAnswer')
      .sort({ submittedAt: -1 });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'No result found for this exam'
      });
    }

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error fetching student exam result:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching exam result',
      error: error.message
    });
  }
};

module.exports = {
  submitExam,
  getResultById,
  getStudentResults,
  getExamResults,
  getExamResultsStatistics,
  getStudentExamResult
};
