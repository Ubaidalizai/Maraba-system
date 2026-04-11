const Supplier = require('../models/supplier.model');
const asyncHandler = require('../middlewares/asyncHandler');
const AppError = require('../utils/appError');

// @desc    Create new supplier
// @route   POST /api/v1/suppliers
// @access  Private/Admin
const createSupplier = asyncHandler(async (req, res, next) => {
  const { name, contact_info } = req.body;

  const supplierExists = await Supplier.findOne({ name, isDeleted: false });
  if (supplierExists) {
    throw new AppError('Supplier with this name already exists', 400);
  }

  const supplier = await Supplier.create({ name, contact_info });

  res.status(201).json({
    status: 'success',
    data: supplier,
  });
});

// @desc    Get all suppliers (with pagination)
// @route   GET /api/v1/suppliers
// @access  Private/Admin
const getAllSuppliers = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const suppliers = await Supplier.find({ isDeleted: false })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const totalSuppliers = await Supplier.countDocuments({ isDeleted: false });

  res.status(200).json({
    status: 'success',
    results: suppliers.length,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalSuppliers / limit),
      totalSuppliers,
    },
    data: suppliers,
  });
});

// @desc    Get single supplier
// @route   GET /api/v1/suppliers/:id
// @access  Private/Admin
const getSupplier = asyncHandler(async (req, res, next) => {
  const supplier = await Supplier.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!supplier) {
    throw new AppError('Supplier not found', 404);
  }

  res.status(200).json({
    status: 'success',
    data: supplier,
  });
});

// @desc    Update supplier
// @route   PATCH /api/v1/suppliers/:id
// @access  Private/Admin
const updateSupplier = asyncHandler(async (req, res, next) => {
  const supplier = await Supplier.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    req.body,
    { new: true, runValidators: true }
  );

  if (!supplier) {
    throw new AppError('Supplier not found or already deleted', 404);
  }

  res.status(200).json({
    status: 'success',
    data: supplier,
  });
});

// @desc    Soft delete supplier
// @route   DELETE /api/v1/suppliers/:id
// @access  Private/Admin
const deleteSupplier = asyncHandler(async (req, res, next) => {
  const supplier = await Supplier.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { isDeleted: true },
    { new: true }
  );

  if (!supplier) {
    throw new AppError('Supplier not found or already deleted', 404);
  }

  res.status(200).json({
    status: 'success',
    message: 'Supplier deleted successfully (soft delete applied)',
  });
});

module.exports = {
  createSupplier,
  getAllSuppliers,
  getSupplier,
  updateSupplier,
  deleteSupplier,
};
