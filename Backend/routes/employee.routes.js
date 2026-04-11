const express = require('express');
const {
  createEmployee,
  getAllEmployees,
  getEmployee,
  updateEmployee,
  deleteEmployee,
} = require('../controllers/employee.controller');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// All routes are protected
router.use(authenticate);

// Employee routes
router.route('/').get(getAllEmployees).post(createEmployee);
router
  .route('/:id')
  .get(getEmployee)
  .patch(updateEmployee)
  .delete(deleteEmployee);

module.exports = router;
