const express = require('express');
const router = express.Router();
const profitController = require('../controllers/profit.controller');
const { authenticate } = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(authenticate);

// @route   GET /api/v1/profit/net
// @desc    Calculate net profit for a date range
// @access  Private
router.get('/net', profitController.getNetProfit);

// @route   GET /api/v1/profit/stats
// @desc    Get detailed profit statistics
// @access  Private
router.get('/stats', profitController.getProfitStats);

// @route   GET /api/v1/profit/summary
// @desc    Get profit summary grouped by time period
// @access  Private
router.get('/summary', profitController.getProfitSummary);

module.exports = router;

