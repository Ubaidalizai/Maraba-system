const express = require('express');
const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  softDeleteProduct,
  restoreProduct,
} = require('../controllers/product.controller');

const router = express.Router();

router.route('/').post(createProduct).get(getAllProducts);

router
  .route('/:id')
  .get(getProductById)
  .patch(updateProduct)
  .delete(softDeleteProduct);

router.patch('/:id/restore', restoreProduct);

module.exports = router;
