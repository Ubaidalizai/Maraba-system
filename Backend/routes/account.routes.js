const express = require('express');
const {
  createAccount,
  getAllAccounts,
  getSystemAccounts,
  getSupplierAccounts,
  getAccount,
  updateAccount,
  deleteAccount,
  restoreAccount,
  getAccountBalances,
  getCashFlowReport,
} = require('../controllers/account.controller');
const { authenticate } = require('../middlewares/authMiddleware');
const {
  getAccountLedger,
} = require('../controllers/accountTransaction.controller');

const router = express.Router();

// protect all account routes
router.use(authenticate);

router.route('/').post(createAccount).get(getAllAccounts);
router.get('/system', getSystemAccounts);
// Reports routes must come BEFORE /:id routes
router.get('/reports/balances', getAccountBalances);
router.get('/reports/cashflow', getCashFlowReport);
router.route('/:id').get(getAccount).patch(updateAccount).delete(deleteAccount);
router.patch('/:id/restore', restoreAccount);
router.get('/:id/ledger', getAccountLedger);

module.exports = router;
