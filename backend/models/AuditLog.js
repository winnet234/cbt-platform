const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'LOGIN',
      'LOGOUT',
      'CREATE_USER',
      'UPDATE_USER',
      'DELETE_USER',
      'CREATE_EXAM',
      'UPDATE_EXAM',
      'DELETE_EXAM',
      'PUBLISH_EXAM',
      'START_EXAM',
      'SUBMIT_EXAM',
      'GRADE_RESULT',
      'CREATE_SUBJECT',
      'UPDATE_SUBJECT',
      'DELETE_SUBJECT',
      'UPLOAD_QUESTIONS',
      'CREATE_ANNOUNCEMENT',
      'UPDATE_SETTINGS',
      'EXPORT_DATA',
      'BACKUP_DATABASE',
      'SUSPICIOUS_ACTIVITY'
    ]
  },
  resource: {
    type: String,
    required: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: String,
  status: {
    type: String,
    enum: ['success', 'failed', 'warning'],
    default: 'success'
  },
  errorMessage: String,
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 7776000 // Auto-delete after 90 days
  }
});

auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resourceId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
