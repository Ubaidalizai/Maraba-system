const asyncHandler = require('../middlewares/asyncHandler');
const AppError = require('../utils/AppError');
const Purchase = require('../models/purchase.model');
const Sale = require('../models/sale.model');
const Product = require('../models/product.model');
const Account = require('../models/account.model');
const AccountTransaction = require('../models/accountTransaction.model');
const Expense = require('../models/expense.model');
const Income = require('../models/income.model');
const Stock = require('../models/stock.model');
const PurchaseItem = require('../models/purchaseItem.model');
const SaleItem = require('../models/saleItem.model');

// @desc Get comprehensive daily report
// @route GET /api/v1/reports/daily
const getDailyReport = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    throw new AppError('د نیټې حد اړین دی', 400);
  }

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const dateFilter = {
    createdAt: { $gte: start, $lte: end },
    isDeleted: false,
  };

  // Purchases aggregation with items
  const purchases = await Purchase.find(dateFilter)
    .populate('supplier', 'name')
    .sort({ createdAt: -1 });

  const purchaseIds = purchases.map(p => p._id);
  const purchaseItems = await PurchaseItem.find({
    purchase: { $in: purchaseIds },
    isDeleted: false,
  }).populate('product', 'name').populate('unit', 'name');

  const purchasesWithItems = purchases.map(purchase => ({
    _id: purchase._id,
    supplier: purchase.supplier,
    purchaseDate: purchase.purchaseDate,
    totalAmount: purchase.totalAmount,
    paidAmount: purchase.paidAmount,
    dueAmount: purchase.dueAmount,
    items: purchaseItems.filter(item => item.purchase.toString() === purchase._id.toString()),
  }));

  const purchaseSummary = {
    count: purchases.length,
    totalAmount: purchases.reduce((sum, p) => sum + p.totalAmount, 0),
    totalPaid: purchases.reduce((sum, p) => sum + p.paidAmount, 0),
    totalRemaining: purchases.reduce((sum, p) => sum + p.dueAmount, 0),
    records: purchasesWithItems,
  };

  // Sales aggregation with items
  const sales = await Sale.find(dateFilter)
    .populate('customer', 'name')
    .sort({ createdAt: -1 });

  const saleIds = sales.map(s => s._id);
  const saleItems = await SaleItem.find({
    sale: { $in: saleIds },
    isDeleted: false,
  }).populate('product', 'name').populate('unit', 'name');

  const salesWithItems = sales.map(sale => ({
    _id: sale._id,
    customer: sale.customer,
    saleDate: sale.saleDate,
    totalAmount: sale.totalAmount,
    paidAmount: sale.paidAmount,
    dueAmount: sale.dueAmount,
    items: saleItems.filter(item => item.sale.toString() === sale._id.toString()),
  }));

  const saleSummary = {
    count: sales.length,
    totalAmount: sales.reduce((sum, s) => sum + s.totalAmount, 0),
    totalPaid: sales.reduce((sum, s) => sum + s.paidAmount, 0),
    totalRemaining: sales.reduce((sum, s) => sum + s.dueAmount, 0),
    records: salesWithItems,
  };

  // Account transactions by type
  const accountTransactions = await AccountTransaction.find({
    date: { $gte: start, $lte: end },
    isDeleted: false,
  })
    .populate('account', 'name type')
    .sort({ date: -1 });

  const groupedTransactions = {
    supplier: { count: 0, total: 0 },
    customer: { count: 0, total: 0 },
    employee: { count: 0, total: 0 },
    cashier: { count: 0, total: 0 },
    safe: { count: 0, total: 0 },
    saraf: { count: 0, total: 0 },
  };

  accountTransactions.forEach(tx => {
    const accountType = tx.account?.type;
    if (groupedTransactions[accountType]) {
      groupedTransactions[accountType].count++;
      groupedTransactions[accountType].total += Math.abs(tx.amount);
    }
  });

  // Expenses aggregation
  const expenses = await Expense.find(dateFilter)
    .populate('paidFromAccount', 'name')
    .sort({ date: -1 });

  const expenseSummary = {
    count: expenses.length,
    totalAmount: expenses.reduce((sum, e) => sum + e.amount, 0),
  };

  // Store inventory summary
  const storeStock = await Stock.find({
    location: 'store',
    isDeleted: false,
  }).populate('product', 'name latestPurchasePrice').populate('unit', 'name');

  const storeSummary = {
    totalValue: storeStock.reduce((sum, s) => sum + (s.quantity * s.purchasePricePerBaseUnit), 0),
    totalProducts: storeStock.length,
    totalQuantity: storeStock.reduce((sum, s) => sum + s.quantity, 0),
    products: storeStock.map(s => ({
      product: s.product,
      unit: s.unit,
      quantity: s.quantity,
      value: s.quantity * s.purchasePricePerBaseUnit,
    })),
  };

  // Store product movements (in/out) for the date range
  const purchaseItemsInRange = await PurchaseItem.find({
    purchase: { $in: purchaseIds },
    isDeleted: false,
  }).populate('product', 'name').populate('unit', 'name');

  const saleItemsInRange = await SaleItem.find({
    sale: { $in: saleIds },
    isDeleted: false,
  }).populate('product', 'name').populate('unit', 'name');

  const productMovements = {};
  
  purchaseItemsInRange.forEach(item => {
    const productId = item.product._id.toString();
    if (!productMovements[productId]) {
      productMovements[productId] = {
        product: item.product,
        quantityIn: 0,
        quantityOut: 0,
        unit: item.unit,
      };
    }
    productMovements[productId].quantityIn += item.quantity;
  });

  saleItemsInRange.forEach(item => {
    const productId = item.product._id.toString();
    if (!productMovements[productId]) {
      productMovements[productId] = {
        product: item.product,
        quantityIn: 0,
        quantityOut: 0,
        unit: item.unit,
      };
    }
    productMovements[productId].quantityOut += item.quantity;
  });

  const storeMovements = Object.values(productMovements);

  // Customer balances - calculate money flow in the date range
  const customerTransactions = await AccountTransaction.find({
    date: { $gte: start, $lte: end },
    isDeleted: false,
  }).populate('account', 'name type');

  const customerAccounts = {};
  customerTransactions
    .filter(tx => tx.account?.type === 'customer')
    .forEach(tx => {
      const accountId = tx.account._id.toString();
      if (!customerAccounts[accountId]) {
        customerAccounts[accountId] = {
          account: { _id: tx.account._id, name: tx.account.name },
          moneyIn: 0,
          moneyOut: 0,
        };
      }
      if (tx.amount > 0) {
        customerAccounts[accountId].moneyIn += tx.amount;
      } else {
        customerAccounts[accountId].moneyOut += Math.abs(tx.amount);
      }
    });

  const customerList = Object.values(customerAccounts);
  const customerSummary = {
    moneyIn: customerList.reduce((sum, c) => sum + c.moneyIn, 0),
    moneyOut: customerList.reduce((sum, c) => sum + c.moneyOut, 0),
    accounts: customerList,
  };

  // Supplier balances - calculate money flow in the date range
  const supplierAccounts = {};
  customerTransactions
    .filter(tx => tx.account?.type === 'supplier')
    .forEach(tx => {
      const accountId = tx.account._id.toString();
      if (!supplierAccounts[accountId]) {
        supplierAccounts[accountId] = {
          account: { _id: tx.account._id, name: tx.account.name },
          moneyIn: 0,
          moneyOut: 0,
        };
      }
      if (tx.amount > 0) {
        supplierAccounts[accountId].moneyIn += tx.amount;
      } else {
        supplierAccounts[accountId].moneyOut += Math.abs(tx.amount);
      }
    });

  const supplierList = Object.values(supplierAccounts);
  const supplierSummary = {
    moneyIn: supplierList.reduce((sum, s) => sum + s.moneyIn, 0),
    moneyOut: supplierList.reduce((sum, s) => sum + s.moneyOut, 0),
    accounts: supplierList,
  };

  // Saraf (money exchanger) balances - calculate money flow in the date range
  const sarafAccounts = {};
  customerTransactions
    .filter(tx => tx.account?.type === 'saraf')
    .forEach(tx => {
      const accountId = tx.account._id.toString();
      if (!sarafAccounts[accountId]) {
        sarafAccounts[accountId] = {
          account: { _id: tx.account._id, name: tx.account.name },
          moneyIn: 0,
          moneyOut: 0,
        };
      }
      if (tx.amount > 0) {
        sarafAccounts[accountId].moneyIn += tx.amount;
      } else {
        sarafAccounts[accountId].moneyOut += Math.abs(tx.amount);
      }
    });

  const sarafList = Object.values(sarafAccounts);
  const sarafSummary = {
    moneyIn: sarafList.reduce((sum, s) => sum + s.moneyIn, 0),
    moneyOut: sarafList.reduce((sum, s) => sum + s.moneyOut, 0),
    accounts: sarafList,
  };

  // Overall summary
  const summary = {
    totalPurchases: purchaseSummary.totalAmount,
    totalSales: saleSummary.totalAmount,
    totalExpenses: expenseSummary.totalAmount,
    storeValue: storeSummary.totalValue,
    storeProducts: storeSummary.totalProducts,
    storeQuantity: storeSummary.totalQuantity,
    customerMoneyIn: customerSummary.moneyIn,
    customerMoneyOut: customerSummary.moneyOut,
    supplierMoneyIn: supplierSummary.moneyIn,
    supplierMoneyOut: supplierSummary.moneyOut,
    sarafMoneyIn: sarafSummary.moneyIn,
    sarafMoneyOut: sarafSummary.moneyOut,
  };

  res.status(200).json({
    success: true,
    data: {
      dateRange: {
        startDate: start,
        endDate: end,
      },
      summary,
      purchases: purchaseSummary,
      sales: saleSummary,
      store: storeSummary,
      storeMovements,
      customers: customerSummary,
      suppliers: supplierSummary,
      saraf: sarafSummary,
      expenses: expenseSummary,
    },
  });
});

module.exports = { getDailyReport };