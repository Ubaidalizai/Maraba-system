const express = require('express');
const {
  getAllExpenses,
  getExpensesByCategory,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  restoreExpense,
  getExpenseStats,
  getExpenseSummary,
} = require('../controllers/expense.controller');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// Protect all expense routes
router.use(authenticate);

// Get all expenses with filtering and pagination
// GET /api/v1/expenses?page=1&limit=50&category=64f8a1b2c3d4e5f6a7b8c9d0&startDate=2024-01-01&endDate=2024-12-31&minAmount=100&maxAmount=1000&createdBy=64f8a1b2c3d4e5f6a7b8c9d0&sortBy=date&sortOrder=desc
router.get('/', getAllExpenses);

// Get expenses by category
// GET /api/v1/expenses/category/:categoryId?page=1&limit=50&startDate=2024-01-01&endDate=2024-12-31&sortBy=date&sortOrder=desc
router.get('/category/:categoryId', getExpensesByCategory);

// Get expense statistics
// GET /api/v1/expenses/stats?startDate=2024-01-01&endDate=2024-12-31&category=64f8a1b2c3d4e5f6a7b8c9d0
router.get('/stats', getExpenseStats);

// Get expense summary by date range
// GET /api/v1/expenses/summary?startDate=2024-01-01&endDate=2024-12-31&groupBy=day
router.get('/summary', getExpenseSummary);

// Get a specific expense by ID
// GET /api/v1/expenses/:id
router.get('/:id', getExpenseById);

// Create a new expense
// POST /api/v1/expenses
// Body: { "category": "64f8a1b2...", "amount": 500, "paidFromAccount": "65aa...", "date": "2024-01-15", "description": "Office supplies" }
router.post('/', createExpense);

// Update an expense
// PATCH /api/v1/expenses/:id
// Body: { "category": "64f8a1b2c3d4e5f6a7b8c9d0", "amount": 600, "description": "Updated description" }
router.patch('/:id', updateExpense);

// Restore a deleted expense
// PATCH /api/v1/expenses/:id/restore
router.patch('/:id/restore', restoreExpense);

// Delete an expense (soft delete)
// DELETE /api/v1/expenses/:id
router.delete('/:id', deleteExpense);

module.exports = router;
