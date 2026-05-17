const express = require('express');
const {
  createSaraf,
  getAllSarafs,
  getSaraf,
  updateSaraf,
  deleteSaraf,
} = require('../controllers/saraf.controller');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// All routes are protected
router.use(authenticate);

// Saraf routes
router.route('/').get(getAllSarafs).post(createSaraf);
router
  .route('/:id')
  .get(getSaraf)
  .patch(updateSaraf)
  .delete(deleteSaraf);

module.exports = router;
