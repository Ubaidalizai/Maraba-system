const mongoose = require('mongoose');
const asyncHandler = require('../middlewares/asyncHandler');
const AppError = require('../utils/AppError');
const Category = require('../models/category.model');
const AuditLog = require('../models/auditLog.model');

// @desc    Get all categories with filtering
// @route   GET /api/v1/categories
exports.getAllCategories = asyncHandler(async (req, res, next) => {
  const {
    type,
    isActive,
    page = 1,
    limit = 50,
    sortBy = 'name',
    sortOrder = 'asc',
  } = req.query;

  const filter = { isDeleted: false };

  if (type) filter.type = type;
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  // Pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Sort
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const [categories, total] = await Promise.all([
    Category.find(filter)
      .populate('created_by', 'name')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Category.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limitNum);
  const hasNextPage = pageNum < totalPages;
  const hasPrevPage = pageNum > 1;

  res.status(200).json({
    success: true,
    count: categories.length,
    total,
    pagination: {
      currentPage: pageNum,
      totalPages,
      hasNextPage,
      hasPrevPage,
      limit: limitNum,
    },
    data: categories,
  });
});

// @desc    Get categories by type (expense, income, both)
// @route   GET /api/v1/categories/type/:type
exports.getCategoriesByType = asyncHandler(async (req, res, next) => {
  const { type } = req.params;
  const { isActive = 'true' } = req.query;

  if (!['expense', 'income', 'both'].includes(type)) {
    throw new AppError(
      'Invalid category type. Must be expense, income, or both',
      400
    );
  }

  const filter = {
    isDeleted: false,
    $or: [{ type: type }, { type: 'both' }],
  };

  if (isActive !== undefined) filter.isActive = isActive === 'true';

  const categories = await Category.find(filter)
    .populate('created_by', 'name')
    .sort({ name: 1 })
    .lean();

  res.status(200).json({
    success: true,
    count: categories.length,
    type,
    data: categories,
  });
});

// @desc    Get a specific category by ID
// @route   GET /api/v1/categories/:id
exports.getCategoryById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid category ID', 400);
  }

  const category = await Category.findOne({ _id: id, isDeleted: false })
    .populate('created_by', 'name')
    .lean();

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  res.status(200).json({
    success: true,
    data: category,
  });
});

// @desc    Create a new category
// @route   POST /api/v1/categories
exports.createCategory = asyncHandler(async (req, res, next) => {
  const { name, type, description, color } = req.body;

  if (!name || !type) {
    throw new AppError('Name and type are required', 400);
  }

  if (!['expense', 'income', 'both'].includes(type)) {
    throw new AppError('Type must be expense, income, or both', 400);
  }

  // Check if category with same name already exists
  const existingCategory = await Category.findOne({
    name: { $regex: new RegExp(`^${name}$`, 'i') },
    isDeleted: false,
  });

  if (existingCategory) {
    throw new AppError('Category with this name already exists', 400);
  }

  const category = await Category.create({
    name,
    type,
    description,
    color: color || '#3B82F6',
    created_by: req.user._id,
  });

  await category.populate('created_by', 'name');

  // Audit log
  await AuditLog.create({
    tableName: 'Category',
    recordId: category._id,
    operation: 'INSERT',
    oldData: null,
    newData: category.toObject(),
    reason: `Category created: ${name}`,
    changedBy: req.user?.name || 'System',
    changedAt: new Date(),
  });

  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: category,
  });
});

// @desc    Update a category
// @route   PUT /api/v1/categories/:id
exports.updateCategory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { name, type, description, color, isActive } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid category ID', 400);
  }

  const category = await Category.findOne({ _id: id, isDeleted: false });
  if (!category) {
    throw new AppError('Category not found', 404);
  }

  // Check if new name conflicts with existing categories
  if (name && name !== category.name) {
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      isDeleted: false,
      _id: { $ne: id },
    });

    if (existingCategory) {
      throw new AppError('Category with this name already exists', 400);
    }
  }

  // Validate type if provided
  if (type && !['expense', 'income', 'both'].includes(type)) {
    throw new AppError('Type must be expense, income, or both', 400);
  }

  const oldData = category.toObject();

  // Update fields
  if (name !== undefined) category.name = name;
  if (type !== undefined) category.type = type;
  if (description !== undefined) category.description = description;
  if (color !== undefined) category.color = color;
  if (isActive !== undefined) category.isActive = isActive;

  await category.save();
  await category.populate('created_by', 'name');

  // Audit log
  await AuditLog.create({
    tableName: 'Category',
    recordId: category._id,
    operation: 'UPDATE',
    oldData,
    newData: category.toObject(),
    reason: `Category updated: ${category.name}`,
    changedBy: req.user?.name || 'System',
    changedAt: new Date(),
  });

  res.status(200).json({
    success: true,
    message: 'Category updated successfully',
    data: category,
  });
});

// @desc    Delete a category (soft delete)
// @route   DELETE /api/v1/categories/:id
exports.deleteCategory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid category ID', 400);
  }

  const category = await Category.findOne({ _id: id, isDeleted: false });
  if (!category) {
    throw new AppError('Category not found', 404);
  }

  const oldData = category.toObject();

  // Soft delete
  category.isDeleted = true;
  category.isActive = false;
  await category.save();

  // Audit log
  await AuditLog.create({
    tableName: 'Category',
    recordId: category._id,
    operation: 'DELETE',
    oldData,
    newData: { isDeleted: true, isActive: false },
    reason: `Category deleted: ${category.name}`,
    changedBy: req.user?.name || 'System',
    changedAt: new Date(),
  });

  res.status(200).json({
    success: true,
    message: 'Category deleted successfully',
  });
});

// @desc    Get category statistics
// @route   GET /api/v1/categories/stats
exports.getCategoryStats = asyncHandler(async (req, res, next) => {
  const stats = await Category.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        activeCount: {
          $sum: { $cond: ['$isActive', 1, 0] },
        },
      },
    },
  ]);

  const result = {
    total: 0,
    active: 0,
    byType: {
      expense: { total: 0, active: 0 },
      income: { total: 0, active: 0 },
      both: { total: 0, active: 0 },
    },
  };

  stats.forEach((stat) => {
    result.total += stat.count;
    result.active += stat.activeCount;
    if (result.byType[stat._id]) {
      result.byType[stat._id].total = stat.count;
      result.byType[stat._id].active = stat.activeCount;
    }
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});
