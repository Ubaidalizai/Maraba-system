const mongoose = require('mongoose');
const asyncHandler = require('../middlewares/asyncHandler');
const AppError = require('../utils/AppError');
const Income = require('../models/income.model');
const Category = require('../models/category.model');
const AuditLog = require('../models/auditLog.model');
const Account = require('../models/account.model');
const AccountTransaction = require('../models/accountTransaction.model');
const {
  parseDeletionFilter,
  markSoftDeleted,
  markRestored,
  validateObjectId,
} = require('../utils/softDeleteHelpers');
const {
  undoLinkedAccountTransactions,
  redoLinkedAccountTransactions,
  updateLinkedAccountTransactionOnEdit,
} = require('../utils/incomeExpenseTrashAccounts');

const normalizeStringInput = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const resolveIncomeSource = (value) => {
  const normalized = normalizeStringInput(value);
  return normalized || 'درآمد عمومی';
};

const buildIncomeDescription = (providedDescription, fallback) => {
  const normalized = normalizeStringInput(providedDescription);
  return normalized || fallback;
};

// @desc    Get all income records with filtering and pagination
// @route   GET /api/v1/income
exports.getAllIncome = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 50,
    category,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    source,
    createdBy,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  // Build filter object
  const filter = parseDeletionFilter(req.query);

  if (category) filter.category = new mongoose.Types.ObjectId(category);
  if (createdBy) filter.createdBy = new mongoose.Types.ObjectId(createdBy);
  if (source) filter.source = { $regex: source, $options: 'i' };

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  if (minAmount || maxAmount) {
    filter.amount = {};
    if (minAmount) filter.amount.$gte = parseFloat(minAmount);
    if (maxAmount) filter.amount.$lte = parseFloat(maxAmount);
  }

  // Pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Sort
  const sort = {};
  const sortDirection = sortOrder === 'desc' ? -1 : 1;
  sort[sortBy] = sortDirection;
  if (sortBy !== 'createdAt') {
    sort.createdAt = sortDirection;
  }
  sort._id = sortDirection;

  // Execute query
  const [incomeRecords, total] = await Promise.all([
    Income.find(filter)
      .populate('category', 'name type color')
      .populate('createdBy', 'name')
      .populate('placedInAccount', 'name type')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Income.countDocuments(filter),
  ]);

  // Calculate pagination info
  const totalPages = Math.ceil(total / limitNum);
  const hasNextPage = pageNum < totalPages;
  const hasPrevPage = pageNum > 1;

  res.status(200).json({
    success: true,
    count: incomeRecords.length,
    total,
    pagination: {
      currentPage: pageNum,
      totalPages,
      hasNextPage,
      hasPrevPage,
      limit: limitNum,
    },
    data: incomeRecords,
  });
});

// @desc    Get income records by category
// @route   GET /api/v1/income/category/:categoryId
exports.getIncomeByCategory = asyncHandler(async (req, res, next) => {
  const { categoryId } = req.params;
  const {
    page = 1,
    limit = 50,
    startDate,
    endDate,
    sortBy = 'date',
    sortOrder = 'desc',
  } = req.query;

  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new AppError('ناسم کېټګورۍ ID', 400);
  }

  const filter = {
    category: new mongoose.Types.ObjectId(categoryId),
    isDeleted: false,
  };

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  // Pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Sort
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const [incomeRecords, total] = await Promise.all([
    Income.find(filter)
      .populate('category', 'name type color')
      .populate('createdBy', 'name')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Income.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limitNum);
  const hasNextPage = pageNum < totalPages;
  const hasPrevPage = pageNum > 1;

  res.status(200).json({
    success: true,
    count: incomeRecords.length,
    total,
    categoryId,
    pagination: {
      currentPage: pageNum,
      totalPages,
      hasNextPage,
      hasPrevPage,
      limit: limitNum,
    },
    data: incomeRecords,
  });
});

// @desc    Get income records by source
// @route   GET /api/v1/income/source/:source
exports.getIncomeBySource = asyncHandler(async (req, res, next) => {
  const { source } = req.params;
  const {
    page = 1,
    limit = 50,
    startDate,
    endDate,
    sortBy = 'date',
    sortOrder = 'desc',
  } = req.query;

  const filter = {
    source: { $regex: new RegExp(source, 'i') },
    isDeleted: false,
  };

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  // Pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Sort
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const [incomeRecords, total] = await Promise.all([
    Income.find(filter)
      .populate('category', 'name type color')
      .populate('createdBy', 'name')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Income.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limitNum);
  const hasNextPage = pageNum < totalPages;
  const hasPrevPage = pageNum > 1;

  res.status(200).json({
    success: true,
    count: incomeRecords.length,
    total,
    source,
    pagination: {
      currentPage: pageNum,
      totalPages,
      hasNextPage,
      hasPrevPage,
      limit: limitNum,
    },
    data: incomeRecords,
  });
});

// @desc    Get a specific income record by ID
// @route   GET /api/v1/income/:id
exports.getIncomeById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('ناسم عاید ID', 400);
  }

  const income = await Income.findOne({ _id: id, isDeleted: false })
    .populate('category', 'name type color')
    .populate('createdBy', 'name')
    .populate('placedInAccount', 'name type')
    .lean();

  if (!income) {
    throw new AppError('د عاید ریکارډ ونه موندل شو', 404);
  }

  res.status(200).json({
    success: true,
    data: income,
  });
});

// @desc    Create a new income record (and post account transaction)
// @route   POST /api/v1/income
// @body    { category, amount, date?, description?, source?, placedInAccount }
exports.createIncome = asyncHandler(async (req, res, next) => {
  const { category, amount, date, description, source, placedInAccount } = req.body;

  if (!category || !amount) {
    throw new AppError('کېټګورۍ او مبلغ اړین دی', 400);
  }

  if (amount <= 0) {
    throw new AppError('مبلغ باید له 0 څخه زیات وي', 400);
  }

  if (!placedInAccount) {
    throw new AppError('د ځای پرځای کولو حساب اړین دی', 400);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate category exists and is for income
    const categoryDoc = await Category.findOne(
      {
        _id: category,
        isDeleted: false,
        isActive: true,
        $or: [{ type: 'income' }, { type: 'both' }],
      },
      null,
      { session }
    );

    if (!categoryDoc) {
      throw new AppError(
        'ناسم کېټګورۍ یا کېټګورۍ د عاید لپاره شتون نلري',
        400
      );
    }

    // Validate account type (cashier, safe, saraf)
    const moneyAccount = await Account.findOne(
      { _id: placedInAccount, isDeleted: false },
      null,
      { session }
    );

    if (!moneyAccount) {
      throw new AppError('د ځای پرځای کولو حساب ونه موندل شو', 404);
    }
    if (!['cashier', 'safe', 'saraf'].includes(moneyAccount.type)) {
      throw new AppError(
        'د ځای پرځای کولو حساب باید د صندوق، خزانه، یا صراف ډول وي',
        400
      );
    }

    const finalSource = resolveIncomeSource(source);
    const normalizedDescription = normalizeStringInput(description);
    const transactionDescription = buildIncomeDescription(
      normalizedDescription,
      `Income: ${categoryDoc.name} from ${finalSource}`
    );

    const incomePayload = {
      category,
      placedInAccount,
      amount,
      date: date ? new Date(date) : new Date(),
      source: finalSource,
      createdBy: req.user._id,
    };

    if (normalizedDescription) {
      incomePayload.description = normalizedDescription;
    }

    // Create income
    const income = await Income.create([incomePayload], { session });
    const createdIncome = income[0];

    // Post account transaction (positive to increase balance)
    const transaction = await AccountTransaction.create(
      [
        {
          account: placedInAccount,
          date: date ? new Date(date) : new Date(),
          transactionType: 'Credit',
          amount: Math.abs(amount),
          referenceType: 'income',
          referenceId: createdIncome._id,
          description: transactionDescription,
          created_by: req.user._id,
        },
      ],
      { session }
    );

    // Update account balance (increase by income amount)
    await Account.findByIdAndUpdate(
      placedInAccount,
      { $inc: { currentBalance: Math.abs(amount) } },
      { session }
    );

    // Audit log
    await AuditLog.create(
      [
        {
          tableName: 'Income',
          recordId: createdIncome._id,
          operation: 'INSERT',
          oldData: null,
          newData: createdIncome.toObject(),
          reason: `Income created: ${categoryDoc.name} - ${amount} from ${finalSource}`,
          changedBy: req.user?.name || 'System',
          changedAt: new Date(),
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    await createdIncome.populate([
      { path: 'category', select: 'name type color' },
      { path: 'createdBy', select: 'name' },
      { path: 'placedInAccount', select: 'name type' },
    ]);

    res.status(201).json({
      success: true,
      message: 'د عاید ریکارډ په بریالیتوب سره جوړ شو',
      data: createdIncome,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

// @desc    Update an income record (re-post account transaction if needed)
// @route   PATCH /api/v1/income/:id
exports.updateIncome = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { category, amount, date, description, source, placedInAccount } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('ناسم عاید ID', 400);
  }

  // Validate amount if provided
  if (amount !== undefined && amount <= 0) {
    throw new AppError('مبلغ باید له 0 څخه زیات وي', 400);
  }

  // Validate category if provided
  if (category) {
    const categoryDoc = await Category.findOne({
      _id: category,
      isDeleted: false,
      isActive: true,
      $or: [{ type: 'income' }, { type: 'both' }],
    });

    if (!categoryDoc) {
      throw new AppError(
        'ناسم کېټګورۍ یا کېټګورۍ د عاید لپاره شتون نلري',
        400
      );
    }
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const income = await Income.findOne({ _id: id, isDeleted: false }, null, { session });
    if (!income) {
      throw new AppError('د عاید ریکارډ ونه موندل شو', 404);
    }

    const oldData = income.toObject();

    let newPlacedInAccount =
      placedInAccount !== undefined ? placedInAccount : income.placedInAccount;
    if (!newPlacedInAccount) {
      throw new AppError('د ځای پرځای کولو حساب اړین دی', 400);
    }

    const moneyAccount = await Account.findOne(
      { _id: newPlacedInAccount, isDeleted: false },
      null,
      { session }
    );
    if (!moneyAccount) {
      throw new AppError('د ځای پرځای کولو حساب ونه موندل شو', 404);
    }
    if (!['cashier', 'safe', 'saraf'].includes(moneyAccount.type)) {
      throw new AppError('د ځای پرځای کولو حساب باید د صندوق، خزانه، یا صراف ډول وي', 400);
    }

    // Apply new fields to income
    if (category !== undefined) income.category = category;
    if (amount !== undefined) income.amount = amount;
    if (date !== undefined) income.date = new Date(date);
    if (description !== undefined) {
      const normalizedDesc = normalizeStringInput(description);
      income.description = normalizedDesc || undefined;
    }
    if (source !== undefined) {
      income.source = resolveIncomeSource(source);
    } else if (!income.source) {
      income.source = 'درآمد عمومی';
    }
    income.placedInAccount = newPlacedInAccount;

    const updatedCategoryDoc = await Category.findById(income.category, null, {
      session,
    });
    const categoryName = updatedCategoryDoc ? updatedCategoryDoc.name : 'Income';
    const txnDescription = buildIncomeDescription(
      income.description,
      `Income: ${categoryName} from ${income.source}`
    );

    await updateLinkedAccountTransactionOnEdit(
      session,
      'income',
      income._id,
      req.user._id,
      {
        amount: income.amount,
        accountId: income.placedInAccount,
        date: income.date,
        description: txnDescription,
        transactionType: 'Credit',
      }
    );

    await income.save({ session });

    // Audit log
    await AuditLog.create(
      [
        {
          tableName: 'Income',
          recordId: income._id,
          operation: 'UPDATE',
          oldData,
          newData: income.toObject(),
          reason: `Income updated: ${income.amount} from ${income.source}`,
          changedBy: req.user?.name || 'System',
          changedAt: new Date(),
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    await income.populate([
      { path: 'category', select: 'name type color' },
      { path: 'createdBy', select: 'name' },
      { path: 'placedInAccount', select: 'name type' },
    ]);

    res.status(200).json({
      success: true,
      message: 'د عاید ریکارډ په بریالیتوب سره تازه شو',
      data: income,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

// @desc    Delete an income record (soft delete + reverse account transaction)
// @route   DELETE /api/v1/income/:id
exports.deleteIncome = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('ناسم عاید ID', 400);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const income = await Income.findOne({ _id: id, isDeleted: false }, null, { session });
    if (!income) {
      throw new AppError('د عاید ریکارډ ونه موندل شو', 404);
    }

    const oldData = income.toObject();

    await undoLinkedAccountTransactions(
      session,
      'income',
      income._id,
      req.user?._id
    );

    // Soft delete
    markSoftDeleted(income, req.user._id);
    await income.save({ session });

    // Audit log
    await AuditLog.create(
      [
        {
          tableName: 'Income',
          recordId: income._id,
          operation: 'DELETE',
          oldData,
          newData: { isDeleted: true },
          reason: `Income deleted: ${income.amount} from ${income.source}`,
          changedBy: req.user?.name || 'System',
          changedAt: new Date(),
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'د عاید ریکارډ په بریالیتوب سره حذف شو',
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

// @desc    Restore a deleted income record (re-applies account transaction)
// @route   PATCH /api/v1/income/:id/restore
exports.restoreIncome = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  validateObjectId(id, 'ناسم عاید ID');

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const income = await Income.findOne(
      { _id: id, isDeleted: true },
      null,
      { session }
    );
    if (!income) {
      throw new AppError('حذف شوی عاید ریکارډ ونه موندل شو', 404);
    }

    const categoryDoc = await Category.findOne(
      {
        _id: income.category,
        isDeleted: false,
        isActive: true,
        $or: [{ type: 'income' }, { type: 'both' }],
      },
      null,
      { session }
    );
    if (!categoryDoc) {
      throw new AppError(
        'عاید بیرته نشي راستنیدلی: کېټګورۍ نور شتون نلري یا غیرفعاله ده',
        400
      );
    }

    if (!income.placedInAccount) {
      throw new AppError('د ځای پرځای کولو حساب شتون نلري', 400);
    }

    const moneyAccount = await Account.findOne(
      { _id: income.placedInAccount, isDeleted: false },
      null,
      { session }
    );
    if (!moneyAccount) {
      throw new AppError('د ځای پرځای کولو حساب ونه موندل شو یا حذف شوی دی', 400);
    }

    await redoLinkedAccountTransactions(
      session,
      'income',
      income._id,
      req.user?._id
    );

    const oldData = income.toObject();
    markRestored(income);
    await income.save({ session });

    await income.populate([
      { path: 'category', select: 'name type color' },
      { path: 'createdBy', select: 'name' },
      { path: 'placedInAccount', select: 'name type' },
    ]);

    await AuditLog.create(
      [
        {
          tableName: 'Income',
          recordId: income._id,
          operation: 'RESTORE',
          oldData,
          newData: income.toObject(),
          reason: `Income restored: ${income.amount} from ${income.source}`,
          changedBy: req.user?.name || 'System',
          changedAt: new Date(),
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'د عاید ریکارډ په بریالیتوب سره بیرته راستون شو',
      data: income,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

// @desc    Get income statistics
// @route   GET /api/v1/income/stats
exports.getIncomeStats = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, category, source } = req.query;

  const matchStage = { isDeleted: false };

  if (startDate || endDate) {
    matchStage.date = {};
    if (startDate) matchStage.date.$gte = new Date(startDate);
    if (endDate) matchStage.date.$lte = new Date(endDate);
  }

  if (category) {
    matchStage.category = new mongoose.Types.ObjectId(category);
  }

  if (source) {
    matchStage.source = { $regex: source, $options: 'i' };
  }

  // Total income and count
  const totalStats = await Income.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        totalCount: { $sum: 1 },
        averageAmount: { $avg: '$amount' },
        minAmount: { $min: '$amount' },
        maxAmount: { $max: '$amount' },
      },
    },
  ]);

  // Income by category
  const categoryStats = await Income.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$category',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'categoryInfo',
      },
    },
    {
      $unwind: '$categoryInfo',
    },
    {
      $project: {
        categoryName: '$categoryInfo.name',
        categoryColor: '$categoryInfo.color',
        totalAmount: 1,
        count: 1,
      },
    },
    { $sort: { totalAmount: -1 } },
  ]);

  // Income by source
  const sourceStats = await Income.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$source',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { totalAmount: -1 } },
  ]);

  // Monthly income
  const monthlyStats = await Income.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
        },
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        year: '$_id.year',
        month: '$_id.month',
        totalAmount: 1,
        count: 1,
      },
    },
    { $sort: { year: -1, month: -1 } },
  ]);

  const result = {
    summary: totalStats[0] || {
      totalAmount: 0,
      totalCount: 0,
      averageAmount: 0,
      minAmount: 0,
      maxAmount: 0,
    },
    byCategory: categoryStats,
    bySource: sourceStats,
    monthly: monthlyStats,
  };

  res.status(200).json({
    success: true,
    data: result,
  });
});

// @desc    Get income summary by date range
// @route   GET /api/v1/income/summary
exports.getIncomeSummary = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, groupBy = 'day' } = req.query;

  if (!startDate || !endDate) {
    throw new AppError('د پیل او پای نیټه اړینه ده', 400);
  }

  const matchStage = {
    isDeleted: false,
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  };

  let groupStage;
  switch (groupBy) {
    case 'day':
      groupStage = {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
          day: { $dayOfMonth: '$date' },
        },
      };
      break;
    case 'week':
      groupStage = {
        _id: {
          year: { $year: '$date' },
          week: { $week: '$date' },
        },
      };
      break;
    case 'month':
      groupStage = {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
        },
      };
      break;
    default:
      throw new AppError(
        'ناسم groupBy پیرامیټر. باید ورځ، اونۍ، یا میاشت وي',
        400
      );
  }

  const summary = await Income.aggregate([
    { $match: matchStage },
    {
      $group: {
        ...groupStage,
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
  ]);

  res.status(200).json({
    success: true,
    data: {
      period: { startDate, endDate },
      groupBy,
      summary,
    },
  });
});

// @desc    Permanently delete a soft-deleted income record
// @route   DELETE /api/v1/income/:id/permanent
exports.permanentDeleteIncome = asyncHandler(async (req, res, next) => {
  validateObjectId(req.params.id, 'ناسم عاید ID');

  const income = await Income.findById(req.params.id);
  if (!income) throw new AppError('د عاید ریکارډ ونه موندل شو', 404);
  if (!income.isDeleted) {
    throw new AppError('لومړی باید عاید په کثافاتو کې حذف شوی وي', 400);
  }

  await AccountTransaction.deleteMany({
    referenceType: 'income',
    referenceId: income._id,
  });
  await Income.deleteOne({ _id: income._id });

  res.status(200).json({
    success: true,
    message: 'د عاید ریکارډ په تل لپاره حذف شو',
  });
});

// @desc    Permanently delete a soft-deleted income record
// @route   DELETE /api/v1/income/:id/permanent
exports.permanentDeleteIncome = asyncHandler(async (req, res, next) => {
  validateObjectId(req.params.id, 'ناسم عاید ID');

  const income = await Income.findById(req.params.id);
  if (!income) throw new AppError('د عاید ریکارډ ونه موندل شو', 404);
  if (!income.isDeleted) {
    throw new AppError('لومړی باید عاید په کثافاتو کې حذف شوی وي', 400);
  }

  await AccountTransaction.deleteMany({
    referenceType: 'income',
    referenceId: income._id,
  });
  await Income.deleteOne({ _id: income._id });

  res.status(200).json({
    success: true,
    message: 'د عاید ریکارډ په تل لپاره حذف شو',
  });
});
