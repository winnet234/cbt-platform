const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  departmentName: {
    type: String,
    required: [true, 'Department name is required'],
    unique: true,
    trim: true
  },
  departmentCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  description: {
    type: String,
    default: ''
  },
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    required: true
  },
  hod: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  numberOfStudents: {
    type: Number,
    default: 0
  },
  numberOfLecturers: {
    type: Number,
    default: 0
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

departmentSchema.index({ departmentCode: 1 });
departmentSchema.index({ faculty: 1 });

module.exports = mongoose.model('Department', departmentSchema);
