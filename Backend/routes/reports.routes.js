const express = require('express');
const router = express.Router();
const { getDailyReport } = require('../controllers/reports.controller');
const { authenticate } = require('../middlewares/authMiddleware');

router.get('/daily', authenticate, getDailyReport);

module.exports = router;
