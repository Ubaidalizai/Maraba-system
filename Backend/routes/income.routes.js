const express = require('express');
const {
  getAllIncome,
  getIncomeByCategory,
  getIncomeBySource,
  getIncomeById,
  createIncome,
  updateIncome,
  deleteIncome,
  restoreIncome,
  getIncomeStats,
  getIncomeSummary,
} = require('../controllers/income.controller');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// Protect all income routes
router.use(authenticate);

// Get all income records with filtering and pagination
// GET /api/v1/income?page=1&limit=50&category=64f8a1b2c3d4e5f6a7b8c9d0&startDate=2024-01-01&endDate=2024-12-31&minAmount=100&maxAmount=1000&source=Sales&createdBy=64f8a1b2c3d4e5f6a7b8c9d0&sortBy=date&sortOrder=desc
router.get('/', getAllIncome);

// Get income records by category
// GET /api/v1/income/category/:categoryId?page=1&limit=50&startDate=2024-01-01&endDate=2024-12-31&sortBy=date&sortOrder=desc
router.get('/category/:categoryId', getIncomeByCategory);

// Get income records by source
// GET /api/v1/income/source/:source?page=1&limit=50&startDate=2024-01-01&endDate=2024-12-31&sortBy=date&sortOrder=desc
router.get('/source/:source', getIncomeBySource);

// Get income statistics
// GET /api/v1/income/stats?startDate=2024-01-01&endDate=2024-12-31&category=64f8a1b2c3d4e5f6a7b8c9d0&source=Sales
router.get('/stats', getIncomeStats);

// Get income summary by date range
// GET /api/v1/income/summary?startDate=2024-01-01&endDate=2024-12-31&groupBy=day
router.get('/summary', getIncomeSummary);

// Get a specific income record by ID
// GET /api/v1/income/:id
router.get('/:id', getIncomeById);

// Create a new income record
// POST /api/v1/income
// Body: { "category": "64f8a1b2c3d4e5f6a7b8c9d0", "amount": 1000, "date": "2024-01-15", "description": "Sales revenue", "source": "Product Sales" }
router.post('/', createIncome);

// Update an income record
// PATCH /api/v1/income/:id
// Body: { "category": "64f8a1b2c3d4e5f6a7b8c9d0", "amount": 1200, "description": "Updated description", "source": "Updated Source" }
router.patch('/:id', updateIncome);

// Restore a deleted income record
// PATCH /api/v1/income/:id/restore
router.patch('/:id/restore', restoreIncome);

// Delete an income record (soft delete)
// DELETE /api/v1/income/:id
router.delete('/:id', deleteIncome);

module.exports = router;
