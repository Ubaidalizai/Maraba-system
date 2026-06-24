const express = require('express');
const {
  getTrashSummary,
  getTrashItems,
} = require('../controllers/trash.controller');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.get('/summary', getTrashSummary);
router.get('/', getTrashItems);

module.exports = router;
