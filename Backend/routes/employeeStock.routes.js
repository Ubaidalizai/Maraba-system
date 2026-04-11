const express = require('express');
const {
  getAllEmployeeStocks,
  getEmployeeStockByEmployee,
  getEmployeeStockRecord,
  returnEmployeeStock,
} = require('../controllers/employeeStock.controller');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// ✅ Apply authentication to all routes
router.use(authenticate);

// 📦 GET all employee stocks
router.get('/', getAllEmployeeStocks);

// 📦 GET all stock for one employee
router.get('/employee/:employeeId', getEmployeeStockByEmployee);

// 📦 GET single employee stock record
router.get('/:id', getEmployeeStockRecord);

// 🔁 Return employee stock to store
router.post('/return', returnEmployeeStock);

module.exports = router;
