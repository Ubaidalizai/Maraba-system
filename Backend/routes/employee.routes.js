const express = require('express');
const {
  createEmployee,
  getAllEmployees,
  getEmployee,
  updateEmployee,
  deleteEmployee,
  restoreEmployee,
  permanentDeleteEmployee,
} = require('../controllers/employee.controller');
const { authenticate, authorizeAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

// All routes are protected
router.use(authenticate);

// Employee routes
router.route('/').get(getAllEmployees).post(createEmployee);
router.patch('/:id/restore', restoreEmployee);
router.delete('/:id/permanent', authorizeAdmin, permanentDeleteEmployee);
router
  .route('/:id')
  .get(getEmployee)
  .patch(updateEmployee)
  .delete(deleteEmployee);

module.exports = router;
