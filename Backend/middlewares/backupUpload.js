const multer = require('multer');
const path = require('path');
const AppError = require('../utils/AppError');
const { BACKUP_DIR, ensureBackupDir } = require('../utils/backupHelpers');

const ALLOWED_MIMES = new Set([
  'application/gzip',
  'application/x-gzip',
  'application/octet-stream',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, ensureBackupDir());
  },
  filename: (_req, file, cb) => {
    const safeBase = path.basename(file.originalname || 'backup.gz').replace(/[^\w.-]/g, '_');
    cb(null, `upload_${Date.now()}_${safeBase}`);
  },
});

const backupUpload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = (file.originalname || '').toLowerCase();
    const mimeOk = ALLOWED_MIMES.has(file.mimetype);
    const extOk = name.endsWith('.gz');
    if (mimeOk || extOk) cb(null, true);
    else cb(new AppError('یوازې .gz بیک اپ فایلونه منل کیږي', 400), false);
  },
}).single('backup');

module.exports = { backupUpload };
