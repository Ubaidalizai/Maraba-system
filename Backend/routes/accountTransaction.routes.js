const express = require('express');
const {
  getAllTransactions,
  createManualTransaction,
  transferBetweenAccounts,
  reverseTransaction,
} = require('../controllers/accountTransaction.controller');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// Protect all account transaction routes
router.use(authenticate);

// Get all account transactions with pagination and filters
router.get('/', getAllTransactions);

// Create a manual transaction (Credit/Debit/Expense)
router.post('/', createManualTransaction);

// Transfer between two accounts (double-entry)
router.post('/transfer', transferBetweenAccounts);

// Reverse a transaction
router.post('/:id/reverse', reverseTransaction);

module.exports = router;
