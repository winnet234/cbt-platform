const Exam = require('../models/Exam');
const Question = require('../models/Question');
const AuditLog = require('../models/AuditLog');
const { v4: uuidv4 } = require('uuid');

// Create exam
const createExam = async (req, res) => {
  try {
    const {
      examTitle,
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

    const examCode = `EXAM-${uuidv4().slice(0, 8).toUpperCase()}`;

    const exam = new Exam({
      examTitle,
      examCode,
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
      level
    });

    await exam.save();

    await AuditLog.create({
      user: req.userId,
      action: 'CREATE_EXAM',
      resource: 'Exam',
      resourceId: exam._id,
      details: { examTitle, examCode },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      message: 'Exam created successfully',
      exam
    });
  } catch (error) {
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
    const { subject, status, isPublished, page = 1, limit = 10 } = req.query;

    let query = {};
    if (subject) query.subject = subject;
    if (status) query.examStatus = status;
    if (isPublished !== undefined) query.isPublished = isPublished === 'true';

    const skip = (page - 1) * limit;
    const exams = await Exam.find(query)
      .populate('subject', 'subjectCode subjectName')
      .populate('lecturer', 'firstName lastName email')
      .limit(limit)
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

    const exam = await Exam.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

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
      exam
    });
  } catch (error) {
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

    if (exam.questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish exam without questions'
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
    const exam = await Exam.findByIdAndDelete(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Delete associated questions
    await Question.deleteMany({ exam: exam._id });

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

    // Add questions that aren't already in the exam
    const newQuestions = questionIds.filter(id => !exam.questions.includes(id));
    exam.questions.push(...newQuestions);
    exam.updatedAt = new Date();
    await exam.save();

    res.json({
      success: true,
      message: 'Questions added to exam successfully',
      exam
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding questions',
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
  addQuestionsToExam
};
