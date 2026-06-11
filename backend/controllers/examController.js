const Exam = require('../models/Exam');
const Question = require('../models/Question');
const Result = require('../models/Result');
const AuditLog = require('../models/AuditLog');
const { v4: uuidv4 } = require('uuid');

// Create exam
const createExam = async (req, res) => {
  try {
    const {
      examTitle,
      examCode,
      description,
      subject,
      totalQuestions,
      totalMarks,
      passMark,
      duration,
      startDate,
      endDate,
      allowedAttempts,
      randomizeQuestions,
      randomizeOptions,
      showResults,
      showCorrectAnswers,
      enableNegativeMarking,
      oneQuestionPerPage,
      preventTabSwitching,
      fullScreenMode,
      allowResumeExam,
      autoSubmitOnTimeExpiry,
      level
    } = req.body;

    // Generate exam code if not provided
    const finalExamCode = examCode || `EXAM-${uuidv4().slice(0, 8).toUpperCase()}`;

    // Check if exam code already exists
    const existingExam = await Exam.findOne({ examCode: finalExamCode });
    if (existingExam) {
      return res.status(400).json({
        success: false,
        message: 'Exam code already exists'
      });
    }

    const exam = new Exam({
      examTitle,
      examCode: finalExamCode,
      description,
      subject,
      lecturer: req.userId,
      totalQuestions,
      totalMarks,
      passMark,
      duration,
      startDate,
      endDate,
      allowedAttempts,
      randomizeQuestions,
      randomizeOptions,
      showResults,
      showCorrectAnswers,
      enableNegativeMarking,
      oneQuestionPerPage,
      preventTabSwitching,
      fullScreenMode,
      allowResumeExam,
      autoSubmitOnTimeExpiry,
      level,
      examStatus: 'draft'
    });

    await exam.save();

    await AuditLog.create({
      user: req.userId,
      action: 'CREATE_EXAM',
      resource: 'Exam',
      resourceId: exam._id,
      details: { examTitle, examCode: finalExamCode },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      message: 'Exam created successfully',
      exam
    });
  } catch (error) {
    console.error('Error creating exam:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating exam',
      error: error.message
    });
  }
};

// Get all exams
const getAllExams = async (req, res) => {
  try {
    const { subject, status, isPublished, page = 1, limit = 10, search } = req.query;

    let query = {};
    if (subject) query.subject = subject;
    if (status) query.examStatus = status;
    if (isPublished !== undefined) query.isPublished = isPublished === 'true';
    if (search) {
      query.$or = [
        { examTitle: { $regex: search, $options: 'i' } },
        { examCode: { $regex: search, $options: 'i' } }
      ];
    }

    // If user is lecturer, only show their exams
    if (req.user && req.user.role === 'lecturer') {
      query.lecturer = req.userId;
    }

    const skip = (page - 1) * limit;
    const exams = await Exam.find(query)
      .populate('subject', 'subjectCode subjectName')
      .populate('lecturer', 'firstName lastName email')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ startDate: -1 });

    const total = await Exam.countDocuments(query);

    res.json({
      success: true,
      exams,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching exams:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching exams',
      error: error.message
    });
  }
};

// Get exam by ID
const getExamById = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('subject', 'subjectCode subjectName')
      .populate('lecturer', 'firstName lastName email')
      .populate('questions');

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    res.json({
      success: true,
      exam
    });
  } catch (error) {
    console.error('Error fetching exam:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching exam',
      error: error.message
    });
  }
};

// Update exam
const updateExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Check if user is the exam creator or admin
    if (exam.lecturer.toString() !== req.userId && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this exam'
      });
    }

    // Don't allow updates if exam has started
    if (exam.examStatus === 'ongoing' || exam.examStatus === 'ended') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update an exam that has started or ended'
      });
    }

    const allowedFields = [
      'examTitle',
      'description',
      'totalQuestions',
      'totalMarks',
      'passMark',
      'duration',
      'startDate',
      'endDate',
      'allowedAttempts',
      'randomizeQuestions',
      'randomizeOptions',
      'showResults',
      'showCorrectAnswers',
      'enableNegativeMarking',
      'oneQuestionPerPage',
      'preventTabSwitching',
      'fullScreenMode',
      'allowResumeExam',
      'autoSubmitOnTimeExpiry'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    updates.updatedAt = new Date();

    const updatedExam = await Exam.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    await AuditLog.create({
      user: req.userId,
      action: 'UPDATE_EXAM',
      resource: 'Exam',
      resourceId: exam._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'Exam updated successfully',
      exam: updatedExam
    });
  } catch (error) {
    console.error('Error updating exam:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating exam',
      error: error.message
    });
  }
};

// Publish exam
const publishExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Verify ownership
    if (exam.lecturer.toString() !== req.userId && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to publish this exam'
      });
    }

    // Check if exam has questions
    if (exam.questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Exam must have at least one question'
      });
    }

    exam.isPublished = true;
    exam.examStatus = 'scheduled';
    exam.updatedAt = new Date();
    await exam.save();

    await AuditLog.create({
      user: req.userId,
      action: 'PUBLISH_EXAM',
      resource: 'Exam',
      resourceId: exam._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'Exam published successfully',
      exam
    });
  } catch (error) {
    console.error('Error publishing exam:', error);
    res.status(500).json({
      success: false,
      message: 'Error publishing exam',
      error: error.message
    });
  }
};

// Delete exam
const deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Verify ownership
    if (exam.lecturer.toString() !== req.userId && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this exam'
      });
    }

    await Exam.findByIdAndDelete(req.params.id);

    // Delete associated questions
    await Question.deleteMany({ exam: req.params.id });

    await AuditLog.create({
      user: req.userId,
      action: 'DELETE_EXAM',
      resource: 'Exam',
      resourceId: exam._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'Exam deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting exam:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting exam',
      error: error.message
    });
  }
};

// Add questions to exam
const addQuestionsToExam = async (req, res) => {
  try {
    const { questionIds } = req.body;

    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Verify ownership
    if (exam.lecturer.toString() !== req.userId && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this exam'
      });
    }

    // Add questions that aren't already in the exam
    const newQuestions = questionIds.filter(id => !exam.questions.includes(id));
    exam.questions.push(...newQuestions);
    exam.updatedAt = new Date();
    await exam.save();

    await AuditLog.create({
      user: req.userId,
      action: 'UPDATE_EXAM',
      resource: 'Exam',
      resourceId: exam._id,
      details: { action: 'added_questions', count: newQuestions.length },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'Questions added to exam successfully',
      exam
    });
  } catch (error) {
    console.error('Error adding questions:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding questions to exam',
      error: error.message
    });
  }
};

// Get exam statistics
const getExamStatistics = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Verify ownership
    if (exam.lecturer.toString() !== req.userId && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this exam statistics'
      });
    }

    const results = await Result.find({ exam: req.params.id });
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

    const passPercentage = results.length > 0
      ? ((passedResults.length / results.length) * 100).toFixed(2)
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
        passPercentage,
        totalStudentsStarted: exam.totalStudentsStarted,
        totalStudentsCompleted: exam.totalStudentsCompleted
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

module.exports = {
  createExam,
  getAllExams,
  getExamById,
  updateExam,
  publishExam,
  deleteExam,
  addQuestionsToExam,
  getExamStatistics
};
