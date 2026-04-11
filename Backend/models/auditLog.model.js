const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  tableName: String,
  recordId: mongoose.Schema.Types.ObjectId,
  operation: { type: String, enum: ['INSERT', 'UPDATE', 'DELETE'] },
  oldData: mongoose.Schema.Types.Mixed,
  newData: mongoose.Schema.Types.Mixed,
  reason: String,
  changedBy: String,
  changedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
