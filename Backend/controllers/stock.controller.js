const Stock = require('../models/stock.model');
const Product = require('../models/product.model');
const Settings = require('../models/settings.model');
const asyncHandler = require('../middlewares/asyncHandler');
const AppError = require('../utils/AppError');
const {
  computeDaysLeft,
  computeExpiryAlertLevel,
  resolveNotifyDays,
  countExpiringAlerts,
} = require('../utils/expiryAlert');
const { countLowStockAlerts } = require('../utils/stockAlert');
const { findLatestPurchaseForBatch } = require('../utils/purchaseStockLink');
const {
  stockValidationSchema,
  updateStockValidationSchema,
} = require('../validations');
const Unit = require('../models/unit.model');
const {
  toStockQuantity,
  loadPrimaryUnitForProduct,
} = require('../utils/primaryUnitStock');

// @desc    Create new stock entry (e.g., during purchase)
// @route   POST /api/v1/stocks
exports.createStock = asyncHandler(async (req, res) => {
  // Validate the request body
  const { error } = stockValidationSchema.validate(req.body);

  if (error) {
    return res.status(400).send({
      success: false,
      message: error.details[0].message,
    });
  }

  const {
    product,
    batchNumber,
    expiry_date,
    location,
    quantity,
    unit,
    conversion_to_default,
    sale_price,
  } = req.body;

  let stockQty = Number(quantity) || 0;
  if (unit) {
    const unitDoc = await Unit.findById(unit);
    const primaryUnit = await loadPrimaryUnitForProduct(product);
    stockQty = toStockQuantity(quantity, unitDoc, primaryUnit);
  } else if (conversion_to_default) {
    stockQty = quantity * conversion_to_default;
  }

  // If stock exists for same product + batch + location → update it
  let stock = await Stock.findOne({
    product,
    batchNumber,
    location,
    isDeleted: false,
  });

  if (stock) {
    stock.quantity += stockQty;
    await stock.save();
  } else {
    stock = await Stock.create({
      product,
      unit,
      batchNumber,
      purchasePricePerBaseUnit: sale_price || 0, // Use sale_price as purchase price
      expiryDate: expiry_date,
      location,
      quantity: stockQty,
    });
  }

  res.status(201).json({ status: 'success', data: stock });
});

// @desc    Get all stocks (with pagination, location & search by product name)
// @route   GET /api/v1/stocks
exports.getAllStocks = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    location,
    search,
    includeZeroQuantity = false,
  } = req.query;

  const query = { isDeleted: false };
  if (location) query.location = location;

  // Filter by quantity - by default exclude zero quantity, unless includeZeroQuantity is true
  if (includeZeroQuantity !== 'true') {
    query.quantity = { $gt: 0 };
  }

  // Build search filter (case-insensitive) for product name
  const searchFilter = search
    ? { name: { $regex: search, $options: 'i' } }
    : {};

  // Step 1️⃣ — Find product IDs that match search (if search provided)
  let productIds = [];
  if (search) {
    const matchingProducts = await Product.find(searchFilter).select('_id');
    productIds = matchingProducts.map((p) => p._id);
    query.product = { $in: productIds };
  }

  // Step 2️⃣ — Fetch paginated stocks (sorted by newest first)
  const stocks = await Stock.find(query)
    .populate('product', 'name notifyDaysBefore')
    .populate('unit', 'name conversion_to_base base_unit')
    .populate({
      path: 'unit',
      populate: {
        path: 'base_unit',
        select: 'name'
      }
    })
    .sort({ createdAt: -1 }) // Newest first
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Stock.countDocuments(query);

  res.status(200).json({
    status: 'success',
    results: stocks.length,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    data: stocks,
  });
});

// @desc    Get single stock by ID
// @route   GET /api/v1/stocks/:id
exports.getStock = asyncHandler(async (req, res) => {
  const stock = await Stock.findOne({ _id: req.params.id, isDeleted: false })
    .populate('product', 'name notifyDaysBefore')
    .populate('unit', 'name');

  console.log(stock);
  if (!stock) throw new AppError('سټاک ونه موندل شو', 404);

  res.status(200).json({ status: 'success', data: stock });
});

// @desc    Purchase that introduced this stock batch (for edit-in-purchase links)
// @route   GET /api/v1/stocks/:id/purchase-source
exports.getStockPurchaseSource = asyncHandler(async (req, res) => {
  const stock = await Stock.findOne({
    _id: req.params.id,
    isDeleted: false,
  }).select('product batchNumber');

  if (!stock) throw new AppError('سټاک ونه موندل شو', 404);

  const source = await findLatestPurchaseForBatch(
    stock.product,
    stock.batchNumber
  );

  res.status(200).json({
    success: true,
    data: source,
  });
});

// @desc    Update stock (e.g., adjust quantity manually)
// @route   PATCH /api/v1/stocks/:id
exports.updateStock = asyncHandler(async (req, res) => {
  // Validate the request body
  const { error } = updateStockValidationSchema.validate(req.body);

  if (error) {
    return res.status(400).send({
      success: false,
      message: error.details[0].message,
    });
  }

  let productNotifyDays;
  if (req.body.notifyDaysBefore !== undefined) {
    const raw = req.body.notifyDaysBefore;
    productNotifyDays =
      raw === '' || raw === null ? null : Number(raw);
  }

  // Cost and expiry are owned by purchase lines — not editable on stock directly
  const updateData = { ...req.body };
  delete updateData.notifyDaysBefore;
  delete updateData.expiry_date;
  delete updateData.expiryDate;
  delete updateData.purchasePricePerBaseUnit;

  const stock = await Stock.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    updateData,
    { new: true, runValidators: true }
  );

  if (!stock) throw new AppError('سټاک ونه موندل شو یا دمخه حذف شوی دی', 404);

  if (productNotifyDays !== undefined && stock.product) {
    await Product.findByIdAndUpdate(stock.product, {
      notifyDaysBefore: productNotifyDays,
    });
  }

  res.status(200).json({ status: 'success', data: stock });
});

// @desc    Soft delete stock entry
// @route   DELETE /api/v1/stocks/:id
exports.deleteStock = asyncHandler(async (req, res) => {
  const stock = await Stock.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { isDeleted: true },
    { new: true }
  );

  if (!stock) throw new AppError('سټاک ونه موندل شو یا دمخه حذف شوی دی', 404);

  res
    .status(200)
    .json({ status: 'success', message: 'سټاک په بریالیتوب سره حذف شو' });
});

// @desc    Get stock report with location and stock level filters
// @route   GET /api/v1/stocks/reports
exports.getStockReport = asyncHandler(async (req, res, next) => {
  const { location, stockLevel } = req.query;

  const query = { isDeleted: false };

  // Filter by location (warehouse or store)
  if (location && (location === 'warehouse' || location === 'store')) {
    query.location = location;
  }

  // Note: Stock level filtering will be done in JavaScript after fetching
  // MongoDB expressions for minLevel calculations are complex, so we filter in memory

  // Fetch all stocks matching location filter
  const allStocks = await Stock.find(query)
    .populate('product', 'name baseUnit latestPurchasePrice trackByBatch')
    .populate('unit', 'name conversion_to_base')
    .sort({ createdAt: -1 }); // Sort by newest first

  // Calculate stock value and determine status for each item
  let stockItems = allStocks.map(stock => {
    const stockValue = stock.quantity * stock.purchasePricePerBaseUnit;
    let status = 'normal';
    
    // Determine status based on the difference between quantity and minLevel
    if (stock.quantity === 0) {
      status = 'out';
    } else if (stock.minLevel > 0) {
      const difference = stock.quantity - stock.minLevel;
      if (difference <= 0) {
        if (stock.quantity <= stock.minLevel * 0.5) {
          status = 'critical';
        } else {
          status = 'low';
        }
      }
    }

    return {
      _id: stock._id,
      product: {
        _id: stock.product._id,
        name: stock.product.name,
        latestPurchasePrice: stock.product.latestPurchasePrice,
      },
      unit: stock.unit ? {
        _id: stock.unit._id,
        name: stock.unit.name,
        conversion_to_base: stock.unit.conversion_to_base,
      } : null,
      batchNumber: stock.batchNumber,
      location: stock.location,
      quantity: stock.quantity,
      minLevel: stock.minLevel,
      purchasePricePerBaseUnit: stock.purchasePricePerBaseUnit,
      stockValue,
      status,
      expiryDate: stock.expiryDate,
    };
  });

  // Filter by stock level if specified
  if (stockLevel) {
    if (stockLevel === 'out') {
      stockItems = stockItems.filter(item => item.status === 'out');
    } else if (stockLevel === 'critical') {
      stockItems = stockItems.filter(item => item.status === 'critical');
    } else if (stockLevel === 'low') {
      stockItems = stockItems.filter(item => item.status === 'low');
    }
  }

  // Count by status
  const counts = {
    total: stockItems.length,
    out: stockItems.filter(item => item.status === 'out').length,
    critical: stockItems.filter(item => item.status === 'critical').length,
    low: stockItems.filter(item => item.status === 'low').length,
    normal: stockItems.filter(item => item.status === 'normal').length,
  };

  res.status(200).json({
    success: true,
    data: {
      stocks: stockItems,
      counts,
      filters: {
        location: location || 'all',
        stockLevel: stockLevel || 'all',
      },
    },
  });
});

// Get all batches for a product at a specific location
exports.getBatchesByProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { location } = req.query; // warehouse / store

  if (!location) {
    throw new AppError('ځای اړین دی (ګودام یا پلورنځی)', 400);
  }

  const batches = await Stock.find({
    product: productId,
    location,
    quantity: { $gt: 0 }, // only show batches with stock left
  })
    .select('batchNumber expiryDate quantity sale_price')
    .sort({ expiryDate: 1 }); // FEFO: first expiring first

  if (!batches || batches.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'په ټاکل شوي ځای کې د دې محصول لپاره بیچونه ونه موندل شول',
    });
  }

  res.status(200).json({
    success: true,
    count: batches.length,
    batches,
  });
});

// @desc    Stocks with expiry alerts (sorted by nearest expiry)
// @route   GET /api/v1/stocks/expiring
exports.getExpiringStocks = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    location,
    search,
    status = 'all',
  } = req.query;

  const settings = await Settings.findOne().lean();
  const defaultNotifyDays = settings?.expiryNotifyDays ?? 14;

  const query = {
    isDeleted: false,
    quantity: { $gt: 0 },
    expiryDate: { $ne: null },
  };

  if (location && location !== 'all') {
    query.location = location;
  }

  if (search) {
    const matchingProducts = await Product.find({
      name: { $regex: search, $options: 'i' },
      isDeleted: false,
    }).select('_id');
    const ids = matchingProducts.map((p) => p._id);
    if (ids.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        total: 0,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: 0,
        counts: { total: 0, out: 0, critical: 0, low: 0 },
        defaultNotifyDays,
      });
    }
    query.product = { $in: ids };
  }

  const stocks = await Stock.find(query)
    .populate('product', 'name notifyDaysBefore')
    .populate('unit', 'name')
    .sort({ expiryDate: 1 })
    .lean();

  let rows = await Promise.all(
    stocks.map(async (stock) => {
      const notifyDays = resolveNotifyDays(
        stock.product?.notifyDaysBefore,
        defaultNotifyDays
      );
      const daysLeft = computeDaysLeft(stock.expiryDate);
      const alertLevel = computeExpiryAlertLevel(daysLeft, notifyDays);
      const productId = stock.product?._id;
      const purchaseSource = productId
        ? await findLatestPurchaseForBatch(productId, stock.batchNumber)
        : null;

      return {
        _id: stock._id,
        product: stock.product
          ? { _id: stock.product._id, name: stock.product.name }
          : null,
        unit: stock.unit ? { _id: stock.unit._id, name: stock.unit.name } : null,
        batchNumber: stock.batchNumber,
        location: stock.location,
        quantity: stock.quantity,
        expiryDate: stock.expiryDate,
        daysLeft,
        notifyDays,
        alertLevel,
        purchaseId: purchaseSource?.purchaseId ?? null,
        purchaseDate: purchaseSource?.purchaseDate ?? null,
      };
    })
  );

  rows = rows.filter((r) => r.alertLevel !== 'normal');

  const counts = {
    total: rows.length,
    out: rows.filter((r) => r.alertLevel === 'out').length,
    critical: rows.filter((r) => r.alertLevel === 'critical').length,
    low: rows.filter((r) => r.alertLevel === 'low').length,
  };

  if (status && status !== 'all') {
    rows = rows.filter((r) => r.alertLevel === status);
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / limitNum));
  const start = (pageNum - 1) * limitNum;
  const data = rows.slice(start, start + limitNum);

  res.status(200).json({
    success: true,
    data,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages,
    counts,
    defaultNotifyDays,
  });
});

// @desc    Get inventory statistics
// @route   GET /api/v1/stocks/stats
exports.getInventoryStats = asyncHandler(async (req, res) => {
  // Get total products count
  const totalProducts = await Product.countDocuments({ isDeleted: false });

  // Get warehouse stock stats
  const warehouseStats = await Stock.aggregate([
    { $match: { location: 'warehouse', isDeleted: false } },
    {
      $group: {
        _id: null,
        totalQuantity: { $sum: '$quantity' },
        totalValue: {
          $sum: { $multiply: ['$quantity', '$purchasePricePerBaseUnit'] },
        },
        uniqueProducts: { $addToSet: '$product' },
      },
    },
  ]);

  // Get store stock stats
  const storeStats = await Stock.aggregate([
    { $match: { location: 'store', isDeleted: false } },
    {
      $group: {
        _id: null,
        totalQuantity: { $sum: '$quantity' },
        totalValue: {
          $sum: { $multiply: ['$quantity', '$purchasePricePerBaseUnit'] },
        },
        uniqueProducts: { $addToSet: '$product' },
      },
    },
  ]);

  const stockRowsForAlerts = await Stock.find({ isDeleted: false })
    .select('quantity minLevel location')
    .lean();
  const lowStockAlertCount = countLowStockAlerts(stockRowsForAlerts);

  const warehouseData = warehouseStats[0] || {
    totalQuantity: 0,
    totalValue: 0,
    uniqueProducts: [],
  };
  const storeData = storeStats[0] || {
    totalQuantity: 0,
    totalValue: 0,
    uniqueProducts: [],
  };

  const settings = await Settings.findOne().lean();
  const defaultNotifyDays = settings?.expiryNotifyDays ?? 14;

  const expiryStocks = await Stock.find({
    isDeleted: false,
    quantity: { $gt: 0 },
    expiryDate: { $ne: null },
  })
    .populate('product', 'notifyDaysBefore')
    .select('expiryDate product')
    .lean();

  const expiringAlertCount = countExpiringAlerts(
    expiryStocks,
    defaultNotifyDays
  );

  res.status(200).json({
    success: true,
    data: {
      totalProducts,
      warehouse: {
        totalQuantity: warehouseData.totalQuantity,
        totalValue: warehouseData.totalValue,
        uniqueProducts: warehouseData.uniqueProducts.length,
      },
      store: {
        totalQuantity: storeData.totalQuantity,
        totalValue: storeData.totalValue,
        uniqueProducts: storeData.uniqueProducts.length,
      },
      lowStockItems: lowStockAlertCount,
      expiringAlertCount,
      expiryNotifyDays: defaultNotifyDays,
    },
  });
});
