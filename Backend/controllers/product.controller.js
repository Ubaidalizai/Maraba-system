const Product = require('../models/product.model');
const Unit = require('../models/unit.model');
const AppError = require('../utils/AppError');
const asyncHandler = require('../middlewares/asyncHandler');
const {
  createProductSchema,
  updateProductSchema,
} = require('../validations/product.validation');

// @desc   Create product
// @route  POST /api/v1/products
exports.createProduct = asyncHandler(async (req, res, next) => {
  const { error } = createProductSchema.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400);

  const {
    name,
    description,
    minLevel,
    baseUnit,
    latestPurchasePrice,
    trackByBatch,
  } = req.body;

  const existing = await Product.findOne({
    name: name.trim(),
    isDeleted: false,
  });
  if (existing)
    throw new AppError('Product with this name already exists', 400);

  const unit = await Unit.findById(baseUnit);
  if (!unit) throw new AppError('Invalid base unit ID', 400);

  const product = await Product.create({
    name: name.trim(),
    description,
    minLevel,
    baseUnit,
    latestPurchasePrice,
    trackByBatch,
  });

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    product,
  });
});

// @desc   Get all products (with pagination & search)
// @route  GET /api/v1/products
exports.getAllProducts = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || '';
  const includeDeleted = req.query.includeDeleted === 'true';

  const filter = {
    ...(search && { name: { $regex: search, $options: 'i' } }),
    ...(includeDeleted ? {} : { isDeleted: false }),
  };


  const total = await Product.countDocuments(filter);

  const products = await Product.find(filter)
    .populate('baseUnit', 'name conversion_to_base')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    results: products.length,
    products,
  });
});

// @desc   Get single product
// @route  GET /api/v1/products/:id
exports.getProductById = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id).populate(
    'baseUnit',
    'name conversion_to_base'
  );

  if (!product || product.isDeleted)
    throw new AppError('Product not found', 404);

  res.status(200).json({ success: true, product });
});

// @desc   Update product
// @route  PUT /api/v1/products/:id
exports.updateProduct = asyncHandler(async (req, res, next) => {
  const { error } = updateProductSchema.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400);

  const product = await Product.findById(req.params.id);
  if (!product || product.isDeleted)
    throw new AppError('Product not found', 404);

  const { name, description, minLevel, baseUnit } = req.body;

  if (baseUnit) {
    const unit = await Unit.findById(baseUnit);
    if (!unit) throw new AppError('Invalid base unit ID', 400);
  }

  product.name = name ?? product.name;
  product.description = description ?? product.description;
  product.minLevel = minLevel ?? product.minLevel;
  product.baseUnit = baseUnit ?? product.baseUnit;

  await product.save();

  res.status(200).json({
    success: true,
    message: 'Product updated successfully',
    product,
  });
});

// @desc   Soft delete product
// @route  DELETE /api/v1/products/:id
exports.softDeleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product || product.isDeleted)
    throw new AppError('Product not found', 404);

  product.isDeleted = true;
  await product.save();

  res.status(200).json({
    success: true,
    message: 'Product deleted successfully',
  });
});

// @desc   Restore soft-deleted product
// @route  PATCH /api/v1/products/:id/restore
exports.restoreProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product || !product.isDeleted)
    throw new AppError('Product not found or not deleted', 404);

  product.isDeleted = false;
  await product.save();

  res.status(200).json({
    success: true,
    message: 'Product restored successfully',
    product,
  });
});
