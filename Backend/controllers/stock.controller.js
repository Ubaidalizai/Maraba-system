const Stock = require('../models/stock.model');
const Product = require('../models/product.model');
const asyncHandler = require('../middlewares/asyncHandler');
const AppError = require('../utils/AppError');
const {
  stockValidationSchema,
  updateStockValidationSchema,
} = require('../validations');

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

  // If stock exists for same product + batch + location → update it
  let stock = await Stock.findOne({
    product,
    batchNumber,
    location,
    isDeleted: false,
  });

  if (stock) {
    stock.quantity += quantity * conversion_to_default;
    await stock.save();
  } else {
    stock = await Stock.create({
      product,
      unit,
      batchNumber,
      purchasePricePerBaseUnit: sale_price || 0, // Use sale_price as purchase price
      expiryDate: expiry_date,
      location,
      quantity: quantity * conversion_to_default,
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
    .populate('product', 'name')
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

  // Step 3️⃣ — Calculate derived unit quantities
  const stocksWithDerivedUnits = stocks.map(stock => {
    const stockObj = stock.toObject();
    
    if (stock.unit && stock.unit.conversion_to_base && stock.unit.conversion_to_base > 1) {
      // Calculate how many derived units (e.g., cartons)
      const derivedQuantity = Math.floor(stock.quantity / stock.unit.conversion_to_base);
      
      stockObj.derivedQuantity = {
        derivedUnit: derivedQuantity, // e.g., 2 cartons
        baseUnitName: stock.unit.base_unit?.name || 'pieces' // e.g., "kg" or "pieces"
      };
    }
    
    return stockObj;
  });

  const total = await Stock.countDocuments(query);

  res.status(200).json({
    status: 'success',
    results: stocksWithDerivedUnits.length,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    data: stocksWithDerivedUnits,
  });
});

// @desc    Get single stock by ID
// @route   GET /api/v1/stocks/:id
exports.getStock = asyncHandler(async (req, res) => {
  const stock = await Stock.findOne({ _id: req.params.id, isDeleted: false })
    .populate('product', 'name')
    .populate('unit', 'name');

  console.log(stock);
  if (!stock) throw new AppError('Stock not found', 404);

  res.status(200).json({ status: 'success', data: stock });
});

// @desc    Update stock (e.g., adjust quantity manually)
// @route   PATCH /api/v1/stocks/:id
exports.updateStock = asyncHandler(async (req, res) => {
  // Convert empty string expiry_date to null before validation
  if (req.body.expiry_date === '' || req.body.expiry_date === undefined) {
    req.body.expiry_date = null;
  }

  // Validate the request body
  const { error } = updateStockValidationSchema.validate(req.body);

  if (error) {
    return res.status(400).send({
      success: false,
      message: error.details[0].message,
    });
  }

  // Prepare update data - convert expiry_date to expiryDate (model field name) and handle null
  const updateData = { ...req.body };
  if (updateData.expiry_date !== undefined) {
    updateData.expiryDate = updateData.expiry_date === null || updateData.expiry_date === '' ? null : updateData.expiry_date;
    delete updateData.expiry_date; // Remove the snake_case version
  }

  const stock = await Stock.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    updateData,
    { new: true, runValidators: true }
  );

  if (!stock) throw new AppError('Stock not found or already deleted', 404);

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

  if (!stock) throw new AppError('Stock not found or already deleted', 404);

  res
    .status(200)
    .json({ status: 'success', message: 'Stock deleted successfully (soft)' });
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
      // Has minLevel defined - calculate difference
      const difference = stock.quantity - stock.minLevel;
      if (difference <= 0) {
        // Quantity is at or below minLevel
        if (stock.quantity <= stock.minLevel * 0.5) {
          status = 'critical';
        } else {
          status = 'low';
        }
      }
      // If difference > 0, status remains 'normal'
    } else {
      // No minLevel defined (minLevel = 0), use default thresholds
      if (stock.quantity <= 10) {
        status = 'critical';
      } else if (stock.quantity <= 50) {
        status = 'low';
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
    throw new AppError('Location is required (warehouse or store)', 400);
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
      message: 'No batches found for this product in the selected location',
    });
  }

  res.status(200).json({
    success: true,
    count: batches.length,
    batches,
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

  // Get low stock items (products below minimum level)
  const lowStockItems = await Product.aggregate([
    { $match: { isDeleted: false } },
    {
      $lookup: {
        from: 'stocks',
        let: { productId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$product', '$$productId'] },
              isDeleted: false,
            },
          },
          {
            $group: {
              _id: null,
              totalQuantity: { $sum: '$quantity' },
            },
          },
        ],
        as: 'stockInfo',
      },
    },
    {
      $addFields: {
        currentStock: {
          $ifNull: [{ $arrayElemAt: ['$stockInfo.totalQuantity', 0] }, 0],
        },
      },
    },
    {
      $match: {
        $expr: { $lt: ['$currentStock', '$minLevel'] },
      },
    },
    {
      $project: {
        name: 1,
        minLevel: 1,
        currentStock: 1,
      },
    },
  ]);

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
      lowStockItems: lowStockItems.length,
      lowStockDetails: lowStockItems,
    },
  });
});
