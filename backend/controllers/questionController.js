const Question = require('../models/Question');
const AuditLog = require('../models/AuditLog');

// Create question
const createQuestion = async (req, res) => {
  try {
    const {
      questionText,
      questionType,
      subject,
      exam,
      options,
      correctAnswer,
      explanation,
      marks,
      negativeMarks,
      difficulty,
      imageUrl
    } = req.body;

    const question = new Question({
      questionText,
      questionType,
      subject,
      exam,
      options,
      correctAnswer,
      explanation,
      marks,
      negativeMarks,
      difficulty,
      imageUrl,
      createdBy: req.userId
    });

    await question.save();

    await AuditLog.create({
      user: req.userId,
      action: 'UPLOAD_QUESTIONS',
      resource: 'Question',
      resourceId: question._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      question
    });
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating question',
      error: error.message
    });
  }
};

// Get all questions
const getAllQuestions = async (req, res) => {
  try {
    const { subject, exam, questionType, difficulty, page = 1, limit = 10 } = req.query;

    let query = { isActive: true };
    if (subject) query.subject = subject;
    if (exam) query.exam = exam;
    if (questionType) query.questionType = questionType;
    if (difficulty) query.difficulty = difficulty;

    const skip = (page - 1) * limit;
    const questions = await Question.find(query)
      .populate('subject', 'subjectCode subjectName')
      .populate('exam', 'examTitle examCode')
      .populate('createdBy', 'firstName lastName email')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Question.countDocuments(query);

    res.json({
      success: true,
      questions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching questions',
      error: error.message
    });
  }
};

// Get question by ID
const getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('subject', 'subjectCode subjectName')
      .populate('exam', 'examTitle examCode')
      .populate('createdBy', 'firstName lastName email');

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    res.json({
      success: true,
      question
    });
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching question',
      error: error.message
    });
  }
};

// Update question
const updateQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check if user is the question creator or admin
    if (question.createdBy.toString() !== req.userId && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this question'
      });
    }

    const allowedFields = [
      'questionText',
      'questionType',
      'options',
      'correctAnswer',
      'explanation',
      'marks',
      'negativeMarks',
      'difficulty',
      'imageUrl'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    updates.updatedAt = new Date();

    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    await AuditLog.create({
      user: req.userId,
      action: 'UPDATE_SUBJECT',
      resource: 'Question',
      resourceId: question._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'Question updated successfully',
      question: updatedQuestion
    });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating question',
      error: error.message
    });
  }
};

// Delete question
const deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check if user is the question creator or admin
    if (question.createdBy.toString() !== req.userId && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this question'
      });
    }

    await Question.findByIdAndDelete(req.params.id);

    await AuditLog.create({
      user: req.userId,
      action: 'DELETE_SUBJECT',
      resource: 'Question',
      resourceId: question._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting question',
      error: error.message
    });
  }
};

// Bulk upload questions
const bulkUploadQuestions = async (req, res) => {
  try {
    const { questions } = req.body;
    const { examId } = req.params;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Questions array is required and must not be empty'
      });
    }

    const createdQuestions = [];

    for (const q of questions) {
      const question = new Question({
        questionText: q.questionText,
        questionType: q.questionType,
        subject: q.subject,
        exam: examId,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        marks: q.marks || 1,
        negativeMarks: q.negativeMarks || 0,
        difficulty: q.difficulty || 'medium',
        imageUrl: q.imageUrl,
        createdBy: req.userId
      });

      await question.save();
      createdQuestions.push(question);
    }

    await AuditLog.create({
      user: req.userId,
      action: 'UPLOAD_QUESTIONS',
      resource: 'Question',
      details: { count: createdQuestions.length, examId },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      message: `${createdQuestions.length} questions uploaded successfully`,
      questions: createdQuestions
    });
  } catch (error) {
    console.error('Error uploading questions:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading questions',
      error: error.message
    });
  }
};

// Get questions by exam
const getQuestionsByExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;
    const questions = await Question.find({ exam: examId, isActive: true })
      .populate('subject', 'subjectCode subjectName')
      .populate('createdBy', 'firstName lastName')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Question.countDocuments({ exam: examId, isActive: true });

    res.json({
      success: true,
      questions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching exam questions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching exam questions',
      error: error.message
    });
  }
};

module.exports = {
  createQuestion,
  getAllQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  bulkUploadQuestions,
  getQuestionsByExam
};
