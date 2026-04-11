const express = require('express');
const {
  transferStock,
  getAllStockTransfers,
  getStockTransfer,
  rollbackStockTransfer, // rollback-safe
  softDeleteStockTransfer, // Soft delete (rollback-safe)
  restoreStockTransfer, // Restore soft-deleted transfer
  updateStockTransfer, // Update transfer
} = require('../controllers/stockTransfer.controller');

const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// ✅ Require authentication for all routes
router.use(authenticate);

// 🔹 Create or list transfers
router
  .route('/')
  .post(transferStock) // Create new stock transfer
  .get(getAllStockTransfers); // Get all transfers (paginated)

// 🔹 Single transfer routes
router
  .route('/:id')
  .get(getStockTransfer) // Get single transfer
  .patch(updateStockTransfer) // Update transfer
  .delete(softDeleteStockTransfer); // Soft delete (rollback-safe)

// 🔹 Restore a previously deleted transfer
router.patch('/:id/restore', restoreStockTransfer);

// 🔹 Rollback a previously transfer
router.patch('/:id/rollback', rollbackStockTransfer);

module.exports = router;
