const Product = require('../models/product.model');
const Unit = require('../models/unit.model');
const Stock = require('../models/stock.model');
const PurchaseItem = require('../models/purchaseItem.model');
const SaleItem = require('../models/saleItem.model');
const Purchase = require('../models/purchase.model');
const Sale = require('../models/sale.model');
const AppError = require('../utils/AppError');
const asyncHandler = require('../middlewares/asyncHandler');
const {
  parseDeletionFilter,
  markSoftDeleted,
  markRestored,
  validateObjectId,
} = require('../utils/softDeleteHelpers');
const {
  createProductSchema,
  updateProductSchema,
} = require('../validations/product.validation');

async function assertProductCanBeSoftDeleted(productId) {
  const stockAgg = await Stock.aggregate([
    { $match: { product: productId, isDeleted: false } },
    { $group: { _id: null, total: { $sum: '$quantity' } } },
  ]);
  const totalStock = stockAgg[0]?.total || 0;
  if (totalStock > 0) {
    throw new AppError(
      'دا محصول نشي حذف کیدای: په ګودام کې سټاک شتون لري',
      400
    );
  }

  const activePurchase = await PurchaseItem.aggregate([
    { $match: { product: productId, isDeleted: false } },
    {
      $lookup: {
        from: 'purchases',
        localField: 'purchase',
        foreignField: '_id',
        as: 'purchaseDoc',
      },
    },
    { $unwind: '$purchaseDoc' },
    { $match: { 'purchaseDoc.isDeleted': false } },
    { $limit: 1 },
  ]);
  if (activePurchase.length > 0) {
    throw new AppError(
      'دا محصول نشي حذف کیدای: فعال رانیولونو کې کارول شوی دی',
      400
    );
  }

  const activeSale = await SaleItem.aggregate([
    { $match: { product: productId, isDeleted: false } },
    {
      $lookup: {
        from: 'sales',
        localField: 'sale',
        foreignField: '_id',
        as: 'saleDoc',
      },
    },
    { $unwind: '$saleDoc' },
    { $match: { 'saleDoc.isDeleted': false } },
    { $limit: 1 },
  ]);
  if (activeSale.length > 0) {
    throw new AppError(
      'دا محصول نشي حذف کیدای: فعال پلورونو کې کارول شوی دی',
      400
    );
  }
}

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
    notifyDaysBefore,
  } = req.body;

  const existing = await Product.findOne({
    name: name.trim(),
    isDeleted: false,
  });
  if (existing)
    throw new AppError('د دې نوم سره محصول دمخه شتون لري', 400);

  const unit = await Unit.findById(baseUnit);
  if (!unit) throw new AppError('ناسم اساسي واحد ID', 400);

  const product = await Product.create({
    name: name.trim(),
    description,
    minLevel,
    baseUnit,
    latestPurchasePrice,
    trackByBatch,
    notifyDaysBefore:
      notifyDaysBefore === '' || notifyDaysBefore === undefined
        ? null
        : notifyDaysBefore,
  });

  res.status(201).json({
    success: true,
    message: 'محصول په بریالیتوب سره جوړ شو',
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

  const filter = parseDeletionFilter(req.query, {
    ...(search && { name: { $regex: search, $options: 'i' } }),
  });

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
    throw new AppError('محصول ونه موندل شو', 404);

  res.status(200).json({ success: true, product });
});

// @desc   Update product
// @route  PUT /api/v1/products/:id
exports.updateProduct = asyncHandler(async (req, res, next) => {
  const { error } = updateProductSchema.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400);

  const product = await Product.findById(req.params.id);
  if (!product || product.isDeleted)
    throw new AppError('محصول ونه موندل شو', 404);

  const { name, description, minLevel, baseUnit, trackByBatch, notifyDaysBefore } =
    req.body;

  if (baseUnit) {
    const unit = await Unit.findById(baseUnit);
    if (!unit) throw new AppError('ناسم اساسي واحد ID', 400);
  }

  product.name = name ?? product.name;
  product.description = description ?? product.description;
  product.minLevel = minLevel ?? product.minLevel;
  product.baseUnit = baseUnit ?? product.baseUnit;
  if (trackByBatch !== undefined) product.trackByBatch = trackByBatch;
  if (notifyDaysBefore !== undefined) {
    product.notifyDaysBefore =
      notifyDaysBefore === '' || notifyDaysBefore === null
        ? null
        : notifyDaysBefore;
  }

  await product.save();

  res.status(200).json({
    success: true,
    message: 'محصول په بریالیتوب سره تازه شو',
    product,
  });
});

// @desc   Soft delete product
// @route  DELETE /api/v1/products/:id
exports.softDeleteProduct = asyncHandler(async (req, res, next) => {
  validateObjectId(req.params.id, 'ناسم محصول ID');

  const product = await Product.findById(req.params.id);
  if (!product || product.isDeleted)
    throw new AppError('محصول ونه موندل شو', 404);

  await assertProductCanBeSoftDeleted(product._id);

  markSoftDeleted(product, req.user?._id);
  await product.save();

  res.status(200).json({
    success: true,
    message: 'محصول په بریالیتوب سره حذف شو',
  });
});

// @desc   Restore soft-deleted product
// @route  PATCH /api/v1/products/:id/restore
exports.restoreProduct = asyncHandler(async (req, res, next) => {
  validateObjectId(req.params.id, 'ناسم محصول ID');

  const product = await Product.findById(req.params.id);
  if (!product || !product.isDeleted)
    throw new AppError('محصول ونه موندل شو یا حذف شوی نه دی', 404);

  const nameConflict = await Product.findOne({
    name: product.name,
    isDeleted: false,
    _id: { $ne: product._id },
  });
  if (nameConflict) {
    throw new AppError(
      'محصول بیرته نشي راستنیدلی: د دې نوم سره بل فعال محصول شتون لري',
      400
    );
  }

  markRestored(product);
  await product.save();

  res.status(200).json({
    success: true,
    message: 'محصول په بریالیتوب سره بیرته راستون شو',
    product,
  });
});

// @desc   Permanently delete a soft-deleted product
// @route  DELETE /api/v1/products/:id/permanent
exports.permanentDeleteProduct = asyncHandler(async (req, res, next) => {
  validateObjectId(req.params.id, 'ناسم محصول ID');

  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('محصول ونه موندل شو', 404);
  if (!product.isDeleted) {
    throw new AppError('لومړی باید محصول په کثافاتو کې حذف شوی وي', 400);
  }

  await Product.deleteOne({ _id: product._id });

  res.status(200).json({
    success: true,
    message: 'محصول په تل لپاره حذف شو',
  });
});
