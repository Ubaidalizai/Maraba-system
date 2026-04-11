const express = require('express');
const {
  createPurchase,
  getAllPurchases,
  getPurchaseById,
  updatePurchase,
  softDeletePurchase,
  restorePurchase,
  recordPurchasePayment,
  getPurchaseReports,
} = require('../controllers/purchase.controller');

const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// All routes are protected
router.use(authenticate);

router.route('/').post(createPurchase).get(getAllPurchases);

// Reports route must come BEFORE /:id routes to avoid route conflicts
router.get('/reports', getPurchaseReports);

router
  .route('/:id')
  .get(getPurchaseById)
  .patch(updatePurchase)
  .delete(softDeletePurchase);

router.patch('/:id/restore', restorePurchase);
router.post('/:id/payment', recordPurchasePayment);

module.exports = router;
