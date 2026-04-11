const express = require('express');
const {
  createSale,
  getAllSales,
  getSale,
  updateSale,
  deleteSale,
  restoreSale,
  getAllSaleReturns,
  returnSaleItem,
  getSaleReturn,
  updateSaleReturn,
  deleteSaleReturn,
  recordSalePayment,
  getSalesReports,
} = require('../controllers/sale.controller');

const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.route('/returns').get(getAllSaleReturns).post(returnSaleItem);

router
  .route('/returns/:id')
  .get(getSaleReturn)
  .patch(updateSaleReturn)
  .delete(deleteSaleReturn);

router.route('/').post(createSale).get(getAllSales);

router.route('/reports').get(getSalesReports);

router.route('/:id').get(getSale).patch(updateSale).delete(deleteSale);

router.patch('/:id/restore', restoreSale);
router.post('/:id/payment', recordSalePayment);

module.exports = router;
