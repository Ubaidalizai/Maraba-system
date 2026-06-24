const express = require('express');
const {
  createSupplier,
  getAllSuppliers,
  getSupplier,
  updateSupplier,
  deleteSupplier,
  restoreSupplier,
  permanentDeleteSupplier,
} = require('../controllers/supplier.controller');
const { authenticate, authorizeAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.route('/').get(getAllSuppliers).post(createSupplier);
router.patch('/:id/restore', restoreSupplier);
router.delete('/:id/permanent', authorizeAdmin, permanentDeleteSupplier);
router
  .route('/:id')
  .get(getSupplier)
  .patch(updateSupplier)
  .delete(deleteSupplier);

module.exports = router;
