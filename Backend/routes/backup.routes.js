const express = require('express');
const rateLimit = require('express-rate-limit');
const { downloadBackup, restoreBackup } = require('../controllers/backup.controller');
const { authenticate, authorizeAdmin } = require('../middlewares/authMiddleware');
const { backupUpload } = require('../middlewares/backupUpload');
const AppError = require('../utils/AppError');

const router = express.Router();

const rateLimitResponse = {
  success: false,
  message: 'ډیرې بیک اپ غوښتنې. مهرباني وکړئ وروسته بیا هڅه وکړئ.',
};

const downloadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: rateLimitResponse,
  standardHeaders: true,
  legacyHeaders: false,
});

const restoreLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: rateLimitResponse,
  standardHeaders: true,
  legacyHeaders: false,
});

const handleBackupUpload = (req, res, next) => {
  backupUpload(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('بیک اپ فایل له 500MB څخه لوی دی', 400));
    }
    return next(err);
  });
};

router.use(authenticate, authorizeAdmin);

router.get('/download', downloadLimiter, downloadBackup);
router.post('/restore', restoreLimiter, handleBackupUpload, restoreBackup);

module.exports = router;
