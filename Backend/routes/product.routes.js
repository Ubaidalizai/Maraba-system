const express = require('express');
const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  softDeleteProduct,
  restoreProduct,
  permanentDeleteProduct,
} = require('../controllers/product.controller');
const { authenticate, authorizeAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.route('/').post(createProduct).get(getAllProducts);

router.patch('/:id/restore', restoreProduct);
router.delete('/:id/permanent', authorizeAdmin, permanentDeleteProduct);

router
  .route('/:id')
  .get(getProductById)
  .patch(updateProduct)
  .delete(softDeleteProduct);

module.exports = router;
