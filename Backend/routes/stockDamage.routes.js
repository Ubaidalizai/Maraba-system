const express = require('express');
const {
  createStockDamage,
  getAllStockDamages,
  getStockDamage,
  deleteStockDamage,
} = require('../controllers/stockDamage.controller');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.route('/').get(getAllStockDamages).post(createStockDamage);
router.route('/:id').get(getStockDamage).delete(deleteStockDamage);

module.exports = router;
