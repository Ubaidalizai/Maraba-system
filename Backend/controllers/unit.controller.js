const Unit = require('../models/unit.model.js');
const asyncHandler = require('../middlewares/asyncHandler.js');
const AppError = require('../utils/AppError.js');
const { unitValidationSchema, updateUnitValidationSchema } = require('../validations/unitValidation.js');

// @desc    Create new unit
// @route   POST /api/v1/unit
// @access  Private/Admin
const createUnit = asyncHandler(async (req, res, next) => {
  // Validate request body
  const { error } = unitValidationSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: error.details[0].message,
    });
  }

  const { name, description, conversion_to_base, is_base_unit, base_unit, unit_type } = req.body;

  // Check for active (non-deleted) units with same name
  const unitExists = await Unit.findOne({ name, isDeleted: false });
  if (unitExists) {
    throw new AppError('د دې نوم سره واحد دمخه شتون لري', 400);
  }

  // Check if a soft-deleted unit with same name exists
  const deletedUnit = await Unit.findOne({ name, isDeleted: true });
  if (deletedUnit) {
    // Restore the deleted unit with new properties
    deletedUnit.description = description;
    deletedUnit.conversion_to_base = conversion_to_base || 1;
    deletedUnit.is_base_unit = is_base_unit || false;
    deletedUnit.base_unit = is_base_unit ? undefined : base_unit;
    deletedUnit.unit_type = unit_type;
    deletedUnit.isDeleted = false;
    
    await deletedUnit.save();
    
    return res.status(201).json({
      status: 'success',
      message: 'دمخه حذف شوی واحد د نويو خاصیتونو سره بیرته راستون شو',
      data: deletedUnit,
    });
  }

  // If this is marked as base unit, ensure conversion_to_base is 1 and no base_unit
  if (is_base_unit) {
    if (conversion_to_base !== 1) {
      throw new AppError('اساسي واحد باید د بدلون مقدار 1 ولري', 400);
    }
    if (base_unit) {
      throw new AppError('اساسي واحد نشي کولای چې اساسي واحد ولري', 400);
    }
  }

  // If this is not a base unit, ensure conversion_to_base and base_unit are provided
  if (!is_base_unit) {
    if (!conversion_to_base || conversion_to_base <= 0) {
      throw new AppError('غیر اساسي واحد باید د بدلون مقدار له 0 څخه زیات ولري', 400);
    }
    if (!base_unit) {
      throw new AppError('غیر اساسي واحد باید اساسي واحد ولري', 400);
    }
    
    // Verify base_unit exists and is actually a base unit (and not deleted)
    const baseUnitDoc = await Unit.findOne({ _id: base_unit, isDeleted: false });
    if (!baseUnitDoc || !baseUnitDoc.is_base_unit) {
      throw new AppError('اساسي واحد باید یو سم فعال اساسي واحد ته اشاره وکړي', 400);
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
    throw new AppError('واحد ونه موندل شو', 404);
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
  // Check if unit is being used anywhere
  const unitId = req.params.id;
  
  // Check if unit is referenced in products
  const Product = require('../models/product.model.js');
  const productCount = await Product.countDocuments({ baseUnit: unitId, isDeleted: false });
  
  // Check if unit is referenced in stock
  const Stock = require('../models/stock.model.js');
  const stockCount = await Stock.countDocuments({ unit: unitId, isDeleted: false });
  
  // Check if unit is referenced in purchase items
  const PurchaseItem = require('../models/purchaseItem.model.js');
  const purchaseItemCount = await PurchaseItem.countDocuments({ unit: unitId, isDeleted: false });
  
  // Check if unit is referenced in sale items
  const SaleItem = require('../models/saleItem.model.js');
  const saleItemCount = await SaleItem.countDocuments({ unit: unitId, isDeleted: false });
  
  const totalReferences = productCount + stockCount + purchaseItemCount + saleItemCount;
  
  if (totalReferences > 0) {
    return res.status(400).json({
      status: 'error',
      message: `واحد تازه کیدای نشي. دا اوس مهال په ${totalReferences} ریکاړډونو کې کاریږي (محصولات: ${productCount}، سټاک: ${stockCount}، پیرود: ${purchaseItemCount}، پلور: ${saleItemCount}). تازه کول به د تاریخي معلوماتو بشپړتیا ته زیان ورسوي.`,
    });
  }
  
  // If not used anywhere, allow limited updates (only name and description)
  const { name, description } = req.body;
  
  const updateData = {};
  if (name !== undefined) {
    // Check if another active unit has the same name
    const duplicateUnit = await Unit.findOne({ 
      name, 
      isDeleted: false,
      _id: { $ne: unitId } // Exclude current unit
    });
    if (duplicateUnit) {
      return res.status(400).json({
        status: 'error',
        message: 'د دې نوم سره بل واحد دمخه شتون لري',
      });
    }
    updateData.name = name;
  }
  if (description !== undefined) updateData.description = description;
  
  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'د ناکارول شويو واحدونو لپاره یوازې نوم او تفصیل تازه کیدای شي',
    });
  }

  const unit = await Unit.findOneAndUpdate(
    { _id: unitId, isDeleted: false },
    updateData,
    { new: true, runValidators: true }
  ).populate('base_unit', 'name is_base_unit');

  if (!unit) {
    throw new AppError('واحد ونه موندل شو یا دمخه حذف شوی دی', 404);
  }

  res.status(200).json({
    status: 'success',
    message: 'واحد په بریالیتوب سره تازه شو. یادونه: یوازې نوم او تفصیل بدلیدای شي.',
    data: unit,
  });
});

// @desc    Soft delete unit
// @route   DELETE /api/v1/unit/:id
// @access  Private/Admin
const deleteUnit = asyncHandler(async (req, res, next) => {
  const unitId = req.params.id;
  
  // Check if unit is being used anywhere
  const Product = require('../models/product.model.js');
  const productCount = await Product.countDocuments({ baseUnit: unitId, isDeleted: false });
  
  const Stock = require('../models/stock.model.js');
  const stockCount = await Stock.countDocuments({ unit: unitId, isDeleted: false });
  
  const PurchaseItem = require('../models/purchaseItem.model.js');
  const purchaseItemCount = await PurchaseItem.countDocuments({ unit: unitId, isDeleted: false });
  
  const SaleItem = require('../models/saleItem.model.js');
  const saleItemCount = await SaleItem.countDocuments({ unit: unitId, isDeleted: false });
  
  const totalReferences = productCount + stockCount + purchaseItemCount + saleItemCount;
  
  if (totalReferences > 0) {
    return res.status(400).json({
      status: 'error',
      message: `واحد حذف کیدای نشي. دا اوس مهال په ${totalReferences} ریکاړډونو کې کاریږي (محصولات: ${productCount}، سټاک: ${stockCount}، پیرود: ${purchaseItemCount}، پلور: ${saleItemCount}). حذف به د معلوماتو بشپړتیا ته زیان ورسوي.`,
    });
  }
  
  // Check if this unit is referenced as base_unit by other units
  const dependentUnits = await Unit.countDocuments({ base_unit: unitId, isDeleted: false });
  if (dependentUnits > 0) {
    return res.status(400).json({
      status: 'error',
      message: `واحد حذف کیدای نشي. ${dependentUnits} بل واحد(ونه) په دې پورې د اساسي واحد په توګه اتکا لري.`,
    });
  }

  const unit = await Unit.findOneAndUpdate(
    { _id: unitId, isDeleted: false },
    { isDeleted: true },
    { new: true }
  );

  if (!unit) {
    throw new AppError('واحد ونه موندل شو یا دمخه حذف شوی دی', 404);
  }

  res.status(200).json({
    status: 'success',
    message: 'واحد په بریالیتوب سره حذف شو',
  });
});

module.exports = {
  createUnit,
  getAllUnits,
  getUnit,
  updateUnit,
  deleteUnit,
};
