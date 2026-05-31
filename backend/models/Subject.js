const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  subjectCode: {
    type: String,
    required: [true, 'Subject code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  subjectName: {
    type: String,
    required: [true, 'Subject name is required'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  units: {
    type: Number,
    required: [true, 'Credit units are required'],
    min: 1,
    max: 6
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  semester: {
    type: String,
    enum: ['1', '2', '1&2'],
    required: true
  },
  level: {
    type: String,
    enum: ['100', '200', '300', '400', '500', '600', '700', '800'],
    required: true
  },
  lecturer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  prerequisite: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

subjectSchema.index({ subjectCode: 1 });
subjectSchema.index({ department: 1 });
subjectSchema.index({ level: 1 });
subjectSchema.index({ lecturer: 1 });

module.exports = mongoose.model('Subject', subjectSchema);
