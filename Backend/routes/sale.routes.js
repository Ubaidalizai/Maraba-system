const express = require('express');
const {
  createSale,
  getAllSales,
  getSale,
  updateSale,
  deleteSale,
  restoreSale,
  permanentDeleteSale,
  getAllSaleReturns,
  returnSaleItem,
  getSaleReturn,
  updateSaleReturn,
  deleteSaleReturn,
  restoreSaleReturn,
  recordSalePayment,
  getSalesReports,
} = require('../controllers/sale.controller');

const { authenticate, authorizeAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.route('/returns').get(getAllSaleReturns).post(returnSaleItem);

router
  .route('/returns/:id')
  .get(getSaleReturn)
  .patch(updateSaleReturn)
  .delete(deleteSaleReturn);

router.patch('/returns/:id/restore', restoreSaleReturn);

router.route('/').post(createSale).get(getAllSales);

router.route('/reports').get(getSalesReports);

router.route('/:id').get(getSale).patch(updateSale).delete(deleteSale);

router.patch('/:id/restore', restoreSale);
router.delete('/:id/permanent', authorizeAdmin, permanentDeleteSale);
router.post('/:id/payment', recordSalePayment);

module.exports = router;
