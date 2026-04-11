const Unit = require('../models/unit.model.js');
const asyncHandler = require('../middlewares/asyncHandler.js');
const AppError = require('../utils/AppError.js');

// @desc    Create new unit
// @route   POST /api/v1/unit
// @access  Private/Admin
const createUnit = asyncHandler(async (req, res, next) => {
  const { name, description, conversion_to_base, is_base_unit, base_unit, unit_type } = req.body;

  const unitExists = await Unit.findOne({ name, isDeleted: false });
  if (unitExists) {
    throw new AppError('Unit with this name already exists', 400);
  }

  // If this is marked as base unit, ensure conversion_to_base is 1 and no base_unit
  if (is_base_unit) {
    if (conversion_to_base !== 1) {
      throw new AppError('Base unit must have conversion_to_base equal to 1', 400);
    }
    if (base_unit) {
      throw new AppError('Base unit cannot have a base_unit reference', 400);
    }
  }

  // If this is not a base unit, ensure conversion_to_base and base_unit are provided
  if (!is_base_unit) {
    if (!conversion_to_base || conversion_to_base <= 0) {
      throw new AppError('Non-base unit must have conversion_to_base greater than 0', 400);
    }
    if (!base_unit) {
      throw new AppError('Non-base unit must have a base_unit reference', 400);
    }
    
    // Verify base_unit exists and is actually a base unit
    const baseUnitDoc = await Unit.findById(base_unit);
    if (!baseUnitDoc || !baseUnitDoc.is_base_unit) {
      throw new AppError('base_unit must reference a valid base unit', 400);
    }
  }

  const unit = await Unit.create({
    name,
    description,
    conversion_to_base: conversion_to_base || 1,
    is_base_unit: is_base_unit || false,
    base_unit: is_base_unit ? undefined : base_unit,
    unit_type
  });

  res.status(201).json({
    status: 'success',
    data: unit,
  });
});

// @desc    Get all units (with pagination)
// @route   GET /api/v1/unit
// @access  Private/Admin
const getAllUnits = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 1000; // Increased default for dropdown usage
  const skip = (page - 1) * limit;

  const Units = await Unit.find({ isDeleted: false })
    .populate('base_unit', 'name is_base_unit')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const totalUnits = await Unit.countDocuments({ isDeleted: false });

  res.status(200).json({
    status: 'success',
    results: Units.length,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalUnits / limit),
      totalUnits,
    },
    data: Units,
  });
});

// @desc    Get single unit
// @route   GET /api/v1/unit/:id
// @access  Private/Admin
const getUnit = asyncHandler(async (req, res, next) => {
  const unit = await Unit.findOne({
    _id: req.params.id,
    isDeleted: false,
  }).populate('base_unit', 'name is_base_unit');

  if (!unit) {
    throw new AppError('Unit not found', 404);
  }

  res.status(200).json({
    status: 'success',
    data: unit,
  });
});

// @desc    Update unit
// @route   PATCH /api/v1/unit/:id
// @access  Private/Admin
const updateUnit = asyncHandler(async (req, res, next) => {
  const unit = await Unit.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    req.body,
    { new: true, runValidators: true }
  );

  if (!unit) {
    throw new AppError('Unit not found or already deleted', 404);
  }

  res.status(200).json({
    status: 'success',
    data: unit,
  });
});

// @desc    Soft delete unit
// @route   DELETE /api/v1/unit/:id
// @access  Private/Admin
const deleteUnit = asyncHandler(async (req, res, next) => {
  const unit = await Unit.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { isDeleted: true },
    { new: true }
  );

  if (!unit) {
    throw new AppError('Unit not found or already deleted', 404);
  }

  res.status(200).json({
    status: 'success',
    message: 'Unit deleted successfully (soft delete applied)',
  });
});

module.exports = {
  createUnit,
  getAllUnits,
  getUnit,
  updateUnit,
  deleteUnit,
};
