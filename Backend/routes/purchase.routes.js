const express = require('express');
const {
  createPurchase,
  getAllPurchases,
  getPurchaseById,
  updatePurchase,
  softDeletePurchase,
  restorePurchase,
  permanentDeletePurchase,
  recordPurchasePayment,
  getPurchaseReports,
  getPurchaseStockConstraints,
} = require('../controllers/purchase.controller');
const {
  returnPurchaseItem,
  getAllPurchaseReturns,
  getPurchaseReturn,
  deletePurchaseReturn,
} = require('../controllers/purchaseReturn.controller');
const { authenticate, authorizeAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.route('/returns').get(getAllPurchaseReturns).post(returnPurchaseItem);

router
  .route('/returns/:id')
  .get(getPurchaseReturn)
  .delete(deletePurchaseReturn);

router.route('/').post(createPurchase).get(getAllPurchases);

router.get('/reports', getPurchaseReports);
router.get('/:id/stock-constraints', getPurchaseStockConstraints);

router.patch('/:id/restore', restorePurchase);
router.delete('/:id/permanent', authorizeAdmin, permanentDeletePurchase);
router.post('/:id/payment', recordPurchasePayment);

router
  .route('/:id')
  .get(getPurchaseById)
  .patch(updatePurchase)
  .delete(softDeletePurchase);

module.exports = router;
