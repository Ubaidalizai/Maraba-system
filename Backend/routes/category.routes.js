const express = require('express');
const {
  getAllCategories,
  getCategoriesByType,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats,
} = require('../controllers/category.controller');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// Protect all category routes
router.use(authenticate);

// Get all categories with filtering and pagination
// GET /api/v1/categories?type=expense&isActive=true&page=1&limit=50&sortBy=name&sortOrder=asc
router.get('/', getAllCategories);

// Get categories by type (expense, income, both)
// GET /api/v1/categories/type/:type?isActive=true
router.get('/type/:type', getCategoriesByType);

// Get category statistics
// GET /api/v1/categories/stats
router.get('/stats', getCategoryStats);

// Get a specific category by ID
// GET /api/v1/categories/:id
router.get('/:id', getCategoryById);

// Create a new category
// POST /api/v1/categories
// Body: { "name": "Office Supplies", "type": "expense", "description": "Office related expenses", "color": "#FF5733" }
router.post('/', createCategory);

// Update a category
// PATCH /api/v1/categories/:id
// Body: { "name": "Updated Name", "type": "both", "isActive": true }
router.patch('/:id', updateCategory);

// Delete a category (soft delete)
// DELETE /api/v1/categories/:id
router.delete('/:id', deleteCategory);

module.exports = router;
