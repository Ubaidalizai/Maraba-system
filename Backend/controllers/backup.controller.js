const path = require('path');
const fs = require('fs');

const asyncHandler = require('../middlewares/asyncHandler');
const AppError = require('../utils/AppError');
const AuditLog = require('../models/auditLog.model');
const User = require('../models/user.model');
const {
  BACKUP_DIR,
  ensureBackupDir,
  checkMongoTools,
  createBackupArchive,
  restoreBackupArchive,
  safeUnlink,
  buildBackupFilename,
} = require('../utils/backupHelpers');

// @desc    Download MongoDB backup (.gz archive)
// @route   GET /api/v1/backup/download
exports.downloadBackup = asyncHandler(async (req, res) => {
  const tools = await checkMongoTools();
  if (!tools.ready) {
    throw new AppError(
      'د MongoDB بیک اپ وسیلې (mongodump/mongorestore) په سرور کې نشته',
      503
    );
  }

  ensureBackupDir();
  const backupFile = buildBackupFilename('mongodb_backup');
  const backupPath = path.join(BACKUP_DIR, backupFile);

  try {
    await createBackupArchive(backupPath);

    if (!fs.existsSync(backupPath)) {
      throw new AppError('بیک اپ فایل جوړ نشو', 500);
    }

    await AuditLog.create({
      tableName: 'Backup',
      recordId: req.user._id,
      operation: 'EXPORT',
      newData: { filename: backupFile, action: 'download' },
      reason: 'Database backup downloaded',
      changedBy: req.user?.name || 'System',
    });

    res.download(backupPath, backupFile, (err) => {
      safeUnlink(backupPath);
      if (err && !res.headersSent) {
        console.error('Backup download error:', err);
      }
    });
  } catch (err) {
    safeUnlink(backupPath);
    throw new AppError(err.message || 'بیک اپ ناکام شو', 500);
  }
});

// @desc    Restore MongoDB from uploaded .gz archive
// @route   POST /api/v1/backup/restore
exports.restoreBackup = asyncHandler(async (req, res) => {
  const adminPassword = String(req.body?.adminPassword || '');

  if (!adminPassword) {
    throw new AppError('د ادمین پاسورډ اړین دی', 400);
  }

  const adminUser = await User.findById(req.user._id).select('+password');
  if (!adminUser || !(await adminUser.isPasswordValid(adminPassword))) {
    throw new AppError('ناسم ادمین پاسورډ', 401);
  }

  if (!req.file?.path) {
    throw new AppError('بیک اپ فایل اړین دی', 400);
  }

  const uploadStats = fs.statSync(req.file.path);
  if (uploadStats.size < 128) {
    safeUnlink(req.file.path);
    throw new AppError('بیک اپ فایل خالي یا ناسم دی', 400);
  }

  const tools = await checkMongoTools();
  if (!tools.ready) {
    safeUnlink(req.file.path);
    throw new AppError(
      'د MongoDB بیک اپ وسیلې (mongodump/mongorestore) په سرور کې نشته',
      503
    );
  }

  const uploadPath = req.file.path;
  const preRestoreFile = buildBackupFilename('pre_restore');
  const preRestorePath = path.join(BACKUP_DIR, preRestoreFile);

  try {
    await createBackupArchive(preRestorePath);
    const restoreResult = await restoreBackupArchive(uploadPath, { drop: true });

    await AuditLog.create({
      tableName: 'Backup',
      recordId: req.user._id,
      operation: 'IMPORT',
      newData: {
        restoredFrom: req.file.originalname,
        preRestoreSnapshot: preRestoreFile,
        documentsRestored: restoreResult.documentsRestored,
      },
      reason: 'Database restored from uploaded backup',
      changedBy: req.user?.name || 'System',
    });

    safeUnlink(uploadPath);
    safeUnlink(preRestorePath);

    res.status(200).json({
      success: true,
      message: 'Database restored successfully',
      documentsRestored: restoreResult.documentsRestored,
    });
  } catch (err) {
    console.error('Restore failed, attempting rollback:', err.message);

    try {
      if (fs.existsSync(preRestorePath)) {
        await restoreBackupArchive(preRestorePath, { drop: true });
      }
    } catch (rollbackErr) {
      console.error('Rollback failed:', rollbackErr.message);
      safeUnlink(uploadPath);
      safeUnlink(preRestorePath);
      throw new AppError(
        `بېرته رغونه ناکامه شوه او اتوماتیک بیرته راګرځول هم ناکام شو: ${rollbackErr.message}`,
        500
      );
    }

    safeUnlink(uploadPath);
    safeUnlink(preRestorePath);
    throw new AppError(err.message || 'بېرته رغونه ناکامه شوه', 500);
  }
});
