const mongoose = require('mongoose');
const asyncHandler = require('../middlewares/asyncHandler');
const AppError = require('../utils/AppError');
const SaleItem = require('../models/saleItem.model');
const Sale = require('../models/sale.model');
const Income = require('../models/income.model');
const Expense = require('../models/expense.model');

/**
 * @desc    Calculate Net Profit for a date range
 * @route   GET /api/v1/profit/net
 * @query   startDate?, endDate?
 * @returns { grossProfit, otherIncome, expenses, netProfit }
 */
exports.getNetProfit = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  // Build date filter for sales
  const saleDateFilter = {};
  if (startDate || endDate) {
    saleDateFilter.saleDate = {};
    if (startDate) saleDateFilter.saleDate.$gte = new Date(startDate);
    if (endDate) saleDateFilter.saleDate.$lte = new Date(endDate);
  }

  // Build date filter for income and expenses
  const dateFilter = {};
  if (startDate || endDate) {
    dateFilter.date = {};
    if (startDate) dateFilter.date.$gte = new Date(startDate);
    if (endDate) dateFilter.date.$lte = new Date(endDate);
  }

  // 1. Calculate Gross Profit from Sales
  // Get all sale items from sales within date range
  const salesInRange = await Sale.find({
    ...saleDateFilter,
    isDeleted: false,
  }).select('_id').lean();

  const saleIds = salesInRange.map((s) => s._id);

  const grossProfitResult = await SaleItem.aggregate([
    {
      $match: {
        sale: { $in: saleIds },
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: null,
        grossProfit: { $sum: '$profit' },
        itemCount: { $sum: 1 },
      },
    },
  ]);

  const grossProfit = grossProfitResult[0]?.grossProfit || 0;

  // 2. Calculate Other Income
  const incomeResult = await Income.aggregate([
    {
      $match: {
        ...dateFilter,
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: null,
        totalIncome: { $sum: '$amount' },
        incomeCount: { $sum: 1 },
      },
    },
  ]);

  const otherIncome = incomeResult[0]?.totalIncome || 0;

  // 3. Calculate Expenses
  const expenseResult = await Expense.aggregate([
    {
      $match: {
        ...dateFilter,
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: null,
        totalExpenses: { $sum: '$amount' },
        expenseCount: { $sum: 1 },
      },
    },
  ]);

  const expenses = expenseResult[0]?.totalExpenses || 0;

  // 4. Calculate Net Profit
  const netProfit = grossProfit + otherIncome - expenses;

  res.status(200).json({
    success: true,
    data: {
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      grossProfit,
      otherIncome,
      expenses,
      netProfit,
      breakdown: {
        grossProfit,
        otherIncome,
        expenses: -expenses, // Show as negative for clarity
        netProfit,
      },
      counts: {
        saleItems: grossProfitResult[0]?.itemCount || 0,
        incomeRecords: incomeResult[0]?.incomeCount || 0,
        expenseRecords: expenseResult[0]?.expenseCount || 0,
      },
    },
  });
});

/**
 * @desc    Get detailed profit statistics
 * @route   GET /api/v1/profit/stats
 * @query   startDate?, endDate?
 * @returns Detailed profit breakdown
 */
exports.getProfitStats = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  // Build date filters
  const saleDateFilter = {};
  if (startDate || endDate) {
    saleDateFilter.saleDate = {};
    if (startDate) saleDateFilter.saleDate.$gte = new Date(startDate);
    if (endDate) saleDateFilter.saleDate.$lte = new Date(endDate);
  }

  const dateFilter = {};
  if (startDate || endDate) {
    dateFilter.date = {};
    if (startDate) dateFilter.date.$gte = new Date(startDate);
    if (endDate) dateFilter.date.$lte = new Date(endDate);
  }

  // Get sales in range
  const salesInRange = await Sale.find({
    ...saleDateFilter,
    isDeleted: false,
  }).select('_id').lean();
  const saleIds = salesInRange.map((s) => s._id);

  // Gross Profit Summary
  const grossProfitSummary = await SaleItem.aggregate([
    {
      $match: {
        sale: { $in: saleIds },
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: null,
        totalProfit: { $sum: '$profit' },
        totalRevenue: { $sum: '$totalPrice' },
        totalCost: { $sum: { $multiply: ['$costPricePerUnit', '$quantity'] } },
        itemCount: { $sum: 1 },
        avgProfit: { $avg: '$profit' },
        minProfit: { $min: '$profit' },
        maxProfit: { $max: '$profit' },
      },
    },
  ]);

  // Gross Profit by Product (top 10)
  const profitByProduct = await SaleItem.aggregate([
    {
      $match: {
        sale: { $in: saleIds },
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: '$product',
        totalProfit: { $sum: '$profit' },
        totalRevenue: { $sum: '$totalPrice' },
        itemCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'productInfo',
      },
    },
    {
      $unwind: '$productInfo',
    },
    {
      $project: {
        productName: '$productInfo.name',
        totalProfit: 1,
        totalRevenue: 1,
        itemCount: 1,
      },
    },
    { $sort: { totalProfit: -1 } },
    { $limit: 10 },
  ]);

  // Monthly Gross Profit
  const monthlyGrossProfit = await Sale.aggregate([
    { $match: { ...saleDateFilter, isDeleted: false } },
    {
      $lookup: {
        from: 'saleitems',
        localField: '_id',
        foreignField: 'sale',
        as: 'items',
      },
    },
    { $unwind: '$items' },
    { $match: { 'items.isDeleted': false } },
    {
      $group: {
        _id: {
          year: { $year: '$saleDate' },
          month: { $month: '$saleDate' },
        },
        totalProfit: { $sum: '$items.profit' },
        saleCount: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        year: '$_id.year',
        month: '$_id.month',
        totalProfit: 1,
        saleCount: 1,
      },
    },
    { $sort: { year: -1, month: -1 } },
  ]);

  // Income by Category
  const incomeByCategory = await Income.aggregate([
    { $match: { ...dateFilter, isDeleted: false } },
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

  // Expenses by Category
  const expensesByCategory = await Expense.aggregate([
    { $match: { ...dateFilter, isDeleted: false } },
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

  // Monthly Income
  const monthlyIncome = await Income.aggregate([
    { $match: { ...dateFilter, isDeleted: false } },
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

  // Monthly Expenses
  const monthlyExpenses = await Expense.aggregate([
    { $match: { ...dateFilter, isDeleted: false } },
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

  // Calculate overall totals
  const grossProfit = grossProfitSummary[0]?.totalProfit || 0;
  const otherIncomeTotal = incomeByCategory.reduce(
    (sum, cat) => sum + cat.totalAmount,
    0
  );
  const expensesTotal = expensesByCategory.reduce(
    (sum, cat) => sum + cat.totalAmount,
    0
  );
  const netProfit = grossProfit + otherIncomeTotal - expensesTotal;

  res.status(200).json({
    success: true,
    data: {
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      summary: {
        grossProfit,
        otherIncome: otherIncomeTotal,
        expenses: expensesTotal,
        netProfit,
      },
      grossProfitDetails: {
        summary: grossProfitSummary[0] || {
          totalProfit: 0,
          totalRevenue: 0,
          totalCost: 0,
          itemCount: 0,
          avgProfit: 0,
          minProfit: 0,
          maxProfit: 0,
        },
        byProduct: profitByProduct,
        monthly: monthlyGrossProfit,
      },
      incomeDetails: {
        byCategory: incomeByCategory,
        monthly: monthlyIncome,
      },
      expenseDetails: {
        byCategory: expensesByCategory,
        monthly: monthlyExpenses,
      },
    },
  });
});

/**
 * @desc    Get profit summary grouped by time period
 * @route   GET /api/v1/profit/summary
 * @query   startDate, endDate, groupBy (day|week|month)
 * @returns Profit summary grouped by time period
 */
exports.getProfitSummary = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, groupBy = 'day' } = req.query;

  if (!startDate || !endDate) {
    throw new AppError('Start date and end date are required', 400);
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Build date grouping stage for sales (using saleDate)
  let saleDateGroupStage;
  let incomeDateGroupStage;
  let expenseDateGroupStage;

  switch (groupBy) {
    case 'day':
      saleDateGroupStage = {
        _id: {
          year: { $year: '$sale.saleDate' },
          month: { $month: '$sale.saleDate' },
          day: { $dayOfMonth: '$sale.saleDate' },
        },
      };
      incomeDateGroupStage = {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
          day: { $dayOfMonth: '$date' },
        },
      };
      expenseDateGroupStage = {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
          day: { $dayOfMonth: '$date' },
        },
      };
      break;
    case 'week':
      saleDateGroupStage = {
        _id: {
          year: { $year: '$sale.saleDate' },
          week: { $week: '$sale.saleDate' },
        },
      };
      incomeDateGroupStage = {
        _id: {
          year: { $year: '$date' },
          week: { $week: '$date' },
        },
      };
      expenseDateGroupStage = {
        _id: {
          year: { $year: '$date' },
          week: { $week: '$date' },
        },
      };
      break;
    case 'month':
      saleDateGroupStage = {
        _id: {
          year: { $year: '$sale.saleDate' },
          month: { $month: '$sale.saleDate' },
        },
      };
      incomeDateGroupStage = {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
        },
      };
      expenseDateGroupStage = {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
        },
      };
      break;
    default:
      throw new AppError(
        'Invalid groupBy parameter. Must be day, week, or month',
        400
      );
  }

  // Gross Profit by period (from sale items)
  const grossProfitByPeriod = await SaleItem.aggregate([
    {
      $match: {
        isDeleted: false,
      },
    },
    {
      $lookup: {
        from: 'sales',
        localField: 'sale',
        foreignField: '_id',
        as: 'sale',
      },
    },
    {
      $unwind: '$sale',
    },
    {
      $match: {
        'sale.isDeleted': false,
        'sale.saleDate': { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        ...saleDateGroupStage,
        grossProfit: { $sum: '$profit' },
      },
    },
  ]);

  // Income by period
  const incomeByPeriod = await Income.aggregate([
    {
      $match: {
        date: { $gte: start, $lte: end },
        isDeleted: false,
      },
    },
    {
      $group: {
        ...incomeDateGroupStage,
        otherIncome: { $sum: '$amount' },
      },
    },
  ]);

  // Expenses by period
  const expensesByPeriod = await Expense.aggregate([
    {
      $match: {
        date: { $gte: start, $lte: end },
        isDeleted: false,
      },
    },
    {
      $group: {
        ...expenseDateGroupStage,
        expenses: { $sum: '$amount' },
      },
    },
  ]);

  // Combine all periods into a map
  const periodMap = new Map();

  // Add gross profit periods
  grossProfitByPeriod.forEach((item) => {
    const key = formatPeriodKey(item._id, groupBy);
    if (!periodMap.has(key)) {
      periodMap.set(key, { grossProfit: 0, otherIncome: 0, expenses: 0 });
    }
    periodMap.get(key).grossProfit = item.grossProfit;
  });

  // Add income periods
  incomeByPeriod.forEach((item) => {
    const key = formatPeriodKey(item._id, groupBy);
    if (!periodMap.has(key)) {
      periodMap.set(key, { grossProfit: 0, otherIncome: 0, expenses: 0 });
    }
    periodMap.get(key).otherIncome = item.otherIncome;
  });

  // Add expense periods
  expensesByPeriod.forEach((item) => {
    const key = formatPeriodKey(item._id, groupBy);
    if (!periodMap.has(key)) {
      periodMap.set(key, { grossProfit: 0, otherIncome: 0, expenses: 0 });
    }
    periodMap.get(key).expenses = item.expenses;
  });

  // Convert to array and calculate net profit
  const summary = Array.from(periodMap.entries())
    .map(([period, data]) => ({
      period,
      grossProfit: data.grossProfit || 0,
      otherIncome: data.otherIncome || 0,
      expenses: data.expenses || 0,
      netProfit: (data.grossProfit || 0) + (data.otherIncome || 0) - (data.expenses || 0),
    }))
    .sort((a, b) => a.period.localeCompare(b.period));

  res.status(200).json({
    success: true,
    data: {
      period: { startDate, endDate },
      groupBy,
      summary,
    },
  });
});

// Helper function to format period key
function formatPeriodKey(id, groupBy) {
  if (groupBy === 'day') {
    return `${id.year}-${String(id.month).padStart(2, '0')}-${String(id.day).padStart(2, '0')}`;
  } else if (groupBy === 'week') {
    return `${id.year}-W${String(id.week).padStart(2, '0')}`;
  } else if (groupBy === 'month') {
    return `${id.year}-${String(id.month).padStart(2, '0')}`;
  }
  return '';
}

