const express = require('express');
const {
  getAllAuditLogs,
  getAuditLogsByRecord,
  getAuditLogsByTable,
  getAuditLogById,
  getAuditLogStats,
  cleanupOldAuditLogs,
} = require('../controllers/auditLog.controller');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// Protect all audit log routes
router.use(authenticate);

// Get all audit logs with filtering and pagination
// GET /api/v1/audit-logs?page=1&limit=50&tableName=AccountTransaction&operation=INSERT&changedBy=admin&startDate=2024-01-01&endDate=2024-12-31&sortBy=changedAt&sortOrder=desc
router.get('/', getAllAuditLogs);

// Get audit logs for a specific record
// GET /api/v1/audit-logs/record/:recordId?tableName=AccountTransaction&operation=INSERT&sortBy=changedAt&sortOrder=desc
router.get('/record/:recordId', getAuditLogsByRecord);

// Get audit logs for a specific table
// GET /api/v1/audit-logs/table/:tableName?page=1&limit=50&operation=INSERT&changedBy=admin&startDate=2024-01-01&endDate=2024-12-31&sortBy=changedAt&sortOrder=desc
router.get('/table/:tableName', getAuditLogsByTable);

// Get a specific audit log by ID
// GET /api/v1/audit-logs/:id
// Get audit log statistics – place BEFORE ":id" to prevent route conflicts
// GET /api/v1/audit-logs/stats?startDate=2024-01-01&endDate=2024-12-31
router.get('/stats', getAuditLogStats);

// Get a specific audit log by ID
// GET /api/v1/audit-logs/:id
router.get('/:id', getAuditLogById);

// Cleanup old audit logs (admin only)
// DELETE /api/v1/audit-logs/cleanup
// Body: { "daysOld": 365 }
router.delete('/cleanup', cleanupOldAuditLogs);

module.exports = router;
