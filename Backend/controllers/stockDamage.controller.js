const mongoose = require('mongoose');
const StockDamage = require('../models/stockDamage.model');
const Product = require('../models/product.model');
const Unit = require('../models/unit.model');
const AuditLog = require('../models/auditLog.model');
const asyncHandler = require('../middlewares/asyncHandler');
const AppError = require('../utils/AppError');
const { createStockDamageSchema } = require('../validations/stockDamage.validation');
const {
  deductDamageLineStock,
  restoreDamageLineStock,
} = require('../utils/stockDamageStock');
const { buildSaleDateFilter } = require('../utils/dateRange');

// @desc    Record stock damage (ضایعات)
// @route   POST /api/v1/stock-damages
exports.createStockDamage = asyncHandler(async (req, res, next) => {
  const { error, value } = createStockDamageSchema.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400);

  const { damageDate, location, employee, damageType, description, items } =
    value;

  if (location === 'employee' && !employee) {
    throw new AppError('د کارکوونکي سټاک ضایعات لپاره کارکوونکی اړین دی', 400);
  }
  if (location !== 'employee' && employee) {
    throw new AppError('کارکوونکی یوازې د کارکوونکي سټاک ضایعات لپاره کارول کیږي', 400);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const damageDateValue = damageDate || new Date();
    const createdDamages = [];

    for (const item of items) {
      const product = await Product.findById(item.product).session(session);
      if (!product) throw new AppError(`محصول ونه موندل شو: ${item.product}`, 400);

      const unit = await Unit.findById(item.unit).session(session);
      if (!unit) throw new AppError('ناسم واحد ID', 400);

      if (product.trackByBatch && !item.batchNumber) {
        throw new AppError(
          `د ${product.name} لپاره د ضایعات ثبتولو کې بیچ شمیره اړینه ده`,
          400
        );
      }

      const stockResult = await deductDamageLineStock({
        session,
        location,
        employeeId: employee,
        item,
        product,
        unit,
      });

      const processedItem = {
        product: item.product,
        unit: item.unit,
        batchNumber: stockResult.batchNumber,
        quantity: item.quantity,
        baseQuantity: stockResult.baseQty,
        costPerBaseUnit: stockResult.costPerBaseUnit,
        lineLossAmount: stockResult.lineLossAmount,
        notes: item.notes,
      };

      const lineLoss = Math.round(stockResult.lineLossAmount * 100) / 100;

      const damageDocs = await StockDamage.create(
        [
          {
            damageDate: damageDateValue,
            location,
            employee: location === 'employee' ? employee : null,
            damageType,
            description,
            totalLossAmount: lineLoss,
            items: [processedItem],
            recordedBy: req.user._id,
          },
        ],
        { session }
      );

      const damage = damageDocs[0];
      createdDamages.push(damage);

      await AuditLog.create(
        [
          {
            tableName: 'StockDamage',
            recordId: damage._id,
            operation: 'INSERT',
            newData: damage.toObject(),
            reason: description || `Stock damage: ${damageType}`,
            changedBy: req.user?.name || 'System',
          },
        ],
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    const populated = await StockDamage.find({
      _id: { $in: createdDamages.map((d) => d._id) },
    })
      .populate('employee', 'name')
      .populate('recordedBy', 'name')
      .populate('items.product', 'name')
      .populate('items.unit', 'name')
      .sort({ createdAt: -1 });

    const count = populated.length;
    res.status(201).json({
      success: true,
      message:
        count > 1
          ? `${count} ضایعات په بریالیتوب سره ثبت شول`
          : 'ضایعات په بریالیتوب سره ثبت شو',
      count,
      data: count === 1 ? populated[0] : populated,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    if (err instanceof AppError) throw err;
    throw new AppError(err.message || 'د ضایعات په ثبتولو کې ناکامي', 500);
  }
});

// @desc    List stock damages
// @route   GET /api/v1/stock-damages
exports.getAllStockDamages = asyncHandler(async (req, res, next) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const query = { isDeleted: false };
  if (req.query.location) query.location = req.query.location;
  if (req.query.employee) query.employee = req.query.employee;

  const dateRange = buildSaleDateFilter(req.query.startDate, req.query.endDate);
  if (dateRange) query.damageDate = dateRange;

  const [records, total] = await Promise.all([
    StockDamage.find(query)
      .populate('employee', 'name')
      .populate('recordedBy', 'name')
      .populate('items.product', 'name')
      .populate('items.unit', 'name')
      .sort({ damageDate: -1 })
      .skip(skip)
      .limit(limit),
    StockDamage.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    results: records.length,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit) || 1,
      totalRecords: total,
    },
    data: records,
  });
});

// @desc    Get one stock damage
// @route   GET /api/v1/stock-damages/:id
exports.getStockDamage = asyncHandler(async (req, res, next) => {
  const damage = await StockDamage.findOne({
    _id: req.params.id,
    isDeleted: false,
  })
    .populate('employee', 'name')
    .populate('recordedBy', 'name email')
    .populate('items.product', 'name')
    .populate('items.unit', 'name');

  if (!damage) throw new AppError('د ضایعات ریکارډ ونه موندل شو', 404);

  res.status(200).json({ success: true, data: damage });
});

// @desc    Soft delete stock damage (restore stock)
// @route   DELETE /api/v1/stock-damages/:id
exports.deleteStockDamage = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const damage = await StockDamage.findById(req.params.id).session(session);
    if (!damage || damage.isDeleted) {
      throw new AppError('د ضایعات ریکارډ ونه موندل شو', 404);
    }

    const oldSnapshot = damage.toObject();

    for (const line of damage.items) {
      const product = await Product.findById(line.product).session(session);
      if (!product) continue;

      await restoreDamageLineStock({
        session,
        location: damage.location,
        employeeId: damage.employee,
        line,
        product,
      });
    }

    damage.isDeleted = true;
    await damage.save({ session });

    await AuditLog.create(
      [
        {
          tableName: 'StockDamage',
          recordId: damage._id,
          operation: 'DELETE',
          oldData: oldSnapshot,
          reason: req.body.reason || 'Stock damage cancelled',
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'ضایعات لغوه شو او سټاک بیرته راستون شو',
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    if (err instanceof AppError) throw err;
    throw new AppError(err.message || 'د ضایعات په لغوه کولو کې ناکامي', 500);
  }
});
