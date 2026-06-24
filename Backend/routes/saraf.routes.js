const express = require('express');
const {
  createSaraf,
  getAllSarafs,
  getSaraf,
  updateSaraf,
  deleteSaraf,
  restoreSaraf,
  permanentDeleteSaraf,
} = require('../controllers/saraf.controller');
const { authenticate, authorizeAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

// All routes are protected
router.use(authenticate);

// Saraf routes
router.route('/').get(getAllSarafs).post(createSaraf);
router.patch('/:id/restore', restoreSaraf);
router.delete('/:id/permanent', authorizeAdmin, permanentDeleteSaraf);
router
  .route('/:id')
  .get(getSaraf)
  .patch(updateSaraf)
  .delete(deleteSaraf);

module.exports = router;
