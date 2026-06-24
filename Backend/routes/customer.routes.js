const express = require('express');
const {
  createCustomer,
  getAllCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  restoreCustomer,
  permanentDeleteCustomer,
} = require('../controllers/customer.controller');
const { authenticate, authorizeAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.route('/').get(getAllCustomers).post(createCustomer);
router.patch('/:id/restore', restoreCustomer);
router.delete('/:id/permanent', authorizeAdmin, permanentDeleteCustomer);
router
  .route('/:id')
  .get(getCustomer)
  .patch(updateCustomer)
  .delete(deleteCustomer);

module.exports = router;
