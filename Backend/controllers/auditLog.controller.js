const mongoose = require('mongoose');
const asyncHandler = require('../middlewares/asyncHandler');
const AppError = require('../utils/AppError');
const AuditLog = require('../models/auditLog.model');

// @desc    Get all audit logs with filtering and pagination
// @route   GET /api/v1/audit-logs
exports.getAllAuditLogs = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 50,
    tableName,
    operation,
    changedBy,
    startDate,
    endDate,
    recordId,
    search,
    sortBy = 'changedAt',
    sortOrder = 'desc',
  } = req.query;

  // Build filter object
  const filter = {};

  if (tableName) filter.tableName = tableName;
  if (operation) filter.operation = operation;
  if (changedBy) filter.changedBy = { $regex: changedBy, $options: 'i' };
  if (recordId) filter.recordId = new mongoose.Types.ObjectId(recordId);

  if (startDate || endDate) {
    filter.changedAt = {};
    if (startDate) filter.changedAt.$gte = new Date(startDate);
    if (endDate) filter.changedAt.$lte = new Date(endDate);
  }

  if (search) {
    filter.$or = [
      { reason: { $regex: search, $options: 'i' } },
      { changedBy: { $regex: search, $options: 'i' } },
      { operation: { $regex: search, $options: 'i' } },
    ];
  }

  // Pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Sort
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Execute query
  const [auditLogs, total] = await Promise.all([
    AuditLog.find(filter).sort(sort).skip(skip).limit(limitNum).lean(),
    AuditLog.countDocuments(filter),
  ]);

  // Calculate pagination info
  const totalPages = Math.ceil(total / limitNum);
  const hasNextPage = pageNum < totalPages;
  const hasPrevPage = pageNum > 1;

  res.status(200).json({
    success: true,
    count: auditLogs.length,
    total,
    pagination: {
      currentPage: pageNum,
      totalPages,
      hasNextPage,
      hasPrevPage,
      limit: limitNum,
    },
    data: auditLogs,
  });
});

// @desc    Get audit logs for a specific record
// @route   GET /api/v1/audit-logs/record/:recordId
exports.getAuditLogsByRecord = asyncHandler(async (req, res, next) => {
  const { recordId } = req.params;
  const {
    tableName,
    operation,
    sortBy = 'changedAt',
    sortOrder = 'desc',
  } = req.query;

  if (!mongoose.Types.ObjectId.isValid(recordId)) {
    throw new AppError('Invalid record ID', 400);
  }

  const filter = { recordId: new mongoose.Types.ObjectId(recordId) };

  if (tableName) filter.tableName = tableName;
  if (operation) filter.operation = operation;

  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const auditLogs = await AuditLog.find(filter).sort(sort).lean();

  res.status(200).json({
    success: true,
    count: auditLogs.length,
    recordId,
    data: auditLogs,
  });
});

// @desc    Get audit logs for a specific table
// @route   GET /api/v1/audit-logs/table/:tableName
exports.getAuditLogsByTable = asyncHandler(async (req, res, next) => {
  const { tableName } = req.params;
  const {
    page = 1,
    limit = 50,
    operation,
    changedBy,
    startDate,
    endDate,
    search,
    sortBy = 'changedAt',
    sortOrder = 'desc',
  } = req.query;

  const filter = { tableName };

  if (operation) filter.operation = operation;
  if (changedBy) filter.changedBy = { $regex: changedBy, $options: 'i' };

  if (startDate || endDate) {
    filter.changedAt = {};
    if (startDate) filter.changedAt.$gte = new Date(startDate);
    if (endDate) filter.changedAt.$lte = new Date(endDate);
  }

  if (search) {
    filter.$or = [
      { reason: { $regex: search, $options: 'i' } },
      { changedBy: { $regex: search, $options: 'i' } },
      { operation: { $regex: search, $options: 'i' } },
    ];
  }

  // Pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Sort
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const [auditLogs, total] = await Promise.all([
    AuditLog.find(filter).sort(sort).skip(skip).limit(limitNum).lean(),
    AuditLog.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limitNum);
  const hasNextPage = pageNum < totalPages;
  const hasPrevPage = pageNum > 1;

  res.status(200).json({
    success: true,
    count: auditLogs.length,
    total,
    tableName,
    pagination: {
      currentPage: pageNum,
      totalPages,
      hasNextPage,
      hasPrevPage,
      limit: limitNum,
    },
    data: auditLogs,
  });
});

// @desc    Get a specific audit log by ID
// @route   GET /api/v1/audit-logs/:id
exports.getAuditLogById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid audit log ID', 400);
  }

  const auditLog = await AuditLog.findById(id).lean();

  if (!auditLog) {
    throw new AppError('Audit log not found', 404);
  }

  res.status(200).json({
    success: true,
    data: auditLog,
  });
});

// @desc    Get audit log statistics
// @route   GET /api/v1/audit-logs/stats
exports.getAuditLogStats = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  const matchStage = {};
  if (startDate || endDate) {
    matchStage.changedAt = {};
    if (startDate) matchStage.changedAt.$gte = new Date(startDate);
    if (endDate) matchStage.changedAt.$lte = new Date(endDate);
  }

  // Simpler and broadly compatible aggregation
  const operationsAgg = await AuditLog.aggregate([
    { $match: matchStage },
    { $group: { _id: '$operation', count: { $sum: 1 } } },
  ]);
  const operationCounts = { INSERT: 0, UPDATE: 0, DELETE: 0 };
  let totalLogs = 0;
  operationsAgg.forEach((o) => {
    totalLogs += o.count;
    if (o._id) operationCounts[o._id] = o.count;
  });

  const tablesAgg = await AuditLog.aggregate([
    { $match: matchStage },
    { $group: { _id: '$tableName', count: { $sum: 1 } } },
  ]);
  const tableCounts = {};
  tablesAgg.forEach((t) => {
    if (t._id) tableCounts[t._id] = t.count;
  });

  const uniqueUsersAgg = await AuditLog.aggregate([
    { $match: matchStage },
    { $group: { _id: '$changedBy' } },
    { $count: 'uniqueUsers' },
  ]);
  const uniqueUsers = uniqueUsersAgg[0]?.uniqueUsers || 0;

  res.status(200).json({
    success: true,
    data: { totalLogs, operationCounts, tableCounts, uniqueUsers },
  });
});

// @desc    Delete old audit logs (cleanup)
// @route   DELETE /api/v1/audit-logs/cleanup
exports.cleanupOldAuditLogs = asyncHandler(async (req, res, next) => {
  const { daysOld = 365 } = req.body;

  if (daysOld < 30) {
    throw new AppError('Cannot delete audit logs less than 30 days old', 400);
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await AuditLog.deleteMany({
    changedAt: { $lt: cutoffDate },
  });

  res.status(200).json({
    success: true,
    message: `Deleted ${result.deletedCount} audit logs older than ${daysOld} days`,
    deletedCount: result.deletedCount,
  });
});
