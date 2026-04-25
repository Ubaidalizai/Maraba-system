const mongoose = require('mongoose');
const Account = require('../models/account.model');
const AuditLog = require('../models/auditLog.model');
const asyncHandler = require('../middlewares/asyncHandler');
const AppError = require('../utils/AppError');

// @desc    Create a new account
// @route   POST /api/v1/accounts
exports.createAccount = asyncHandler(async (req, res, next) => {
  const { type, refId, name, openingBalance, currency } = req.body;

  // Validation
  if (!type || !name) throw new AppError('Type and Name are required', 400);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Ensure no duplicate account for same type + refId (except saraf - allow multiple)
    if (type !== 'saraf') {
      const existing = await Account.findOne({
        type,
        refId,
        isDeleted: false,
      }).session(session);
      if (existing)
        throw new AppError('Account already exists for this entity', 400);
    }

    const account = await Account.create(
      [
        {
          type,
          refId: refId || null,
          name,
          openingBalance: openingBalance || 0,
          currentBalance: openingBalance || 0,
          currency: currency || 'AFN',
        },
      ],
      { session }
    );

    // Audit log
    await AuditLog.create(
      [
        {
          tableName: 'Account',
          recordId: account[0]._id,
          operation: 'INSERT',
          oldData: null,
          newData: account[0],
          reason: 'Account created',
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: 'حساب په بریالیتوب سره جوړ شو',
      account: account[0],
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(err.message || 'Failed to create account', 500);
  }
});

// @desc    Get all accounts
// @route   GET /api/v1/accounts
exports.getAllAccounts = asyncHandler(async (req, res, next) => {
  const { type, search, page = 1, limit = 10 } = req.query;

  const query = { isDeleted: false };
  if (type) query.type = type;
  if (search) query.name = { $regex: search, $options: 'i' };

  const skip = (page - 1) * limit;
  const [accounts, total] = await Promise.all([
    Account.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Account.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
    accounts,
  });
});

// @desc    Get system accounts (cashier, safe, saraf)
// @route   GET /api/v1/accounts/system
exports.getSystemAccounts = asyncHandler(async (req, res, next) => {
  const systemTypes = ['cashier', 'safe', 'saraf'];
  
  const accounts = await Account.find({
    type: { $in: systemTypes },
    isDeleted: false
  }).sort({ type: 1, name: 1 });

  res.status(200).json({
    success: true,
    accounts,
  });
});


// @desc    Get single account
// @route   GET /api/v1/accounts/:id
exports.getAccount = asyncHandler(async (req, res, next) => {
  const accountId = req.params.id;
  const account = await Account.findOne({ _id: accountId, isDeleted: false });
  if (!account) throw new AppError('Account not found', 404);

  res.status(200).json({ success: true, account });
});

// @desc    Update account details
// @route   PATCH /api/v1/accounts/:id
exports.updateAccount = asyncHandler(async (req, res, next) => {
  const { name, openingBalance, currency } = req.body;
  const accountId = req.params.id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const account = await Account.findById(accountId).session(session);
    if (!account || account.isDeleted)
      throw new AppError('Account not found', 404);

    const oldData = { ...account.toObject() };

    if (name) account.name = name;
    if (openingBalance !== undefined) account.openingBalance = openingBalance;
    if (currency) account.currency = currency;

    await account.save({ session });

    await AuditLog.create(
      [
        {
          tableName: 'Account',
          recordId: account._id,
          operation: 'UPDATE',
          oldData,
          newData: account.toObject(),
          reason: req.body.reason || 'Account updated',
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'حساب په بریالیتوب سره تازه شو',
      account,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(err.message || 'Failed to update account', 500);
  }
});

// @desc    Soft delete an account
// @route   DELETE /api/v1/accounts/:id
exports.deleteAccount = asyncHandler(async (req, res, next) => {
  const accountId = req.params.id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const account = await Account.findById(accountId).session(session);
    if (!account || account.isDeleted)
      throw new AppError('Account not found', 404);

    const oldData = { ...account.toObject() };
    account.isDeleted = true;
    await account.save({ session });

    await AuditLog.create(
      [
        {
          tableName: 'Account',
          recordId: account._id,
          operation: 'DELETE',
          oldData,
          reason: req.body.reason || 'Account soft deleted',
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'حساب په بریالیتوب سره حذف شو',
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(err.message || 'Failed to delete account', 500);
  }
});

// @desc    Restore a soft-deleted account
// @route   PATCH /api/v1/accounts/:id/restore
exports.restoreAccount = asyncHandler(async (req, res, next) => {
  const accountId = req.params.id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const account = await Account.findById(accountId).session(session);
    if (!account) throw new AppError('Account not found', 404);
    if (!account.isDeleted)
      throw new AppError('Account is already active', 400);

    account.isDeleted = false;
    await account.save({ session });

    await AuditLog.create(
      [
        {
          tableName: 'Account',
          recordId: account._id,
          operation: 'RESTORE',
          oldData: null,
          newData: account.toObject(),
          reason: req.body.reason || 'Account restored',
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'حساب په بریالیتوب سره بیرته راستون شو',
      account,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(err.message || 'Failed to restore account', 500);
  }
});

// @desc    Transfer money between system accounts
// @route   POST /api/v1/accounts/transfer
exports.transferBetweenAccounts = asyncHandler(async (req, res, next) => {
  const { fromAccountId, toAccountId, amount, description } = req.body;

  // Validation
  if (!fromAccountId || !toAccountId || !amount) {
    throw new AppError('د حساب، منزل حساب او اندازه اړینه ده', 400);
  }

  if (fromAccountId === toAccountId) {
    throw new AppError('تاسو نشئ کولی ورته حساب ته پیسې انتقال کړئ', 400);
  }

  if (amount <= 0) {
    throw new AppError('اندازه باید مثبته وي', 400);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const AccountTransaction = require('../models/accountTransaction.model');

    // Get both accounts
    const [fromAccount, toAccount] = await Promise.all([
      Account.findOne({ _id: fromAccountId, isDeleted: false }).session(session),
      Account.findOne({ _id: toAccountId, isDeleted: false }).session(session),
    ]);

    if (!fromAccount) throw new AppError('د سرچینې حساب ونه موندل شو', 404);
    if (!toAccount) throw new AppError('د منزل حساب ونه موندل شو', 404);

    // Validate both are system accounts
    const systemTypes = ['cashier', 'safe', 'saraf'];
    if (!systemTypes.includes(fromAccount.type)) {
      throw new AppError('د سرچینې حساب باید سیسټم حساب وي (دخل، تجری، صراف)', 400);
    }
    if (!systemTypes.includes(toAccount.type)) {
      throw new AppError('د منزل حساب باید سیسټم حساب وي (دخل، تجری، صراف)', 400);
    }

    // Validate balance for non-saraf accounts
    if (fromAccount.type !== 'saraf') {
      const newBalance = fromAccount.currentBalance - amount;
      if (newBalance < 0) {
        throw new AppError(
          `د ${fromAccount.name} کافي بیلانس نشته. اوسنی بیلانس: ${fromAccount.currentBalance}`,
          400
        );
      }
    }

    // Create reference ID for linking transactions
    const transferRefId = new mongoose.Types.ObjectId();

    // Create debit transaction for FROM account (money goes out)
    const debitTransaction = await AccountTransaction.create(
      [
        {
          account: fromAccount._id,
          transactionType: 'Transfer',
          amount: -amount, // Negative = money out
          balanceAfter: fromAccount.currentBalance - amount,
          description: description || `انتقال ته ${toAccount.name}`,
          referenceType: 'transfer',
          referenceId: transferRefId,
          date: new Date(),
          created_by: req.user._id,
        },
      ],
      { session }
    );

    // Create credit transaction for TO account (money comes in)
    const creditTransaction = await AccountTransaction.create(
      [
        {
          account: toAccount._id,
          transactionType: 'Transfer',
          amount: amount, // Positive = money in
          balanceAfter: toAccount.currentBalance + amount,
          description: description || `انتقال له ${fromAccount.name}`,
          referenceType: 'transfer',
          referenceId: transferRefId,
          date: new Date(),
          created_by: req.user._id,
        },
      ],
      { session }
    );

    // Update account balances
    fromAccount.currentBalance -= amount;
    toAccount.currentBalance += amount;

    await Promise.all([
      fromAccount.save({ session }),
      toAccount.save({ session }),
    ]);

    // Audit logs
    await AuditLog.create(
      [
        {
          tableName: 'AccountTransaction',
          recordId: transferRefId,
          operation: 'INSERT',
          oldData: null,
          newData: {
            from: fromAccount.name,
            to: toAccount.name,
            amount,
            description,
          },
          reason: 'د حسابونو ترمنځ انتقال',
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'پیسې په بریالیتوب سره انتقال شوې',
      data: {
        transferId: transferRefId,
        from: {
          account: fromAccount.name,
          newBalance: fromAccount.currentBalance,
        },
        to: {
          account: toAccount.name,
          newBalance: toAccount.currentBalance,
        },
        amount,
      },
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(err.message || 'انتقال ناکام شو', 500);
  }
});

// @desc    Get account balances overview (grouped by type)
// @route   GET /api/v1/accounts/reports/balances
exports.getAccountBalances = asyncHandler(async (req, res, next) => {
  const accounts = await Account.find({ isDeleted: false }).lean();

  // Group accounts by type and calculate totals
  const balancesByType = {
    cashier: { accounts: [], totalBalance: 0 },
    safe: { accounts: [], totalBalance: 0 },
    saraf: { accounts: [], totalBalance: 0 },
    supplier: { accounts: [], totalBalance: 0 },
    customer: { accounts: [], totalBalance: 0 },
    employee: { accounts: [], totalBalance: 0 },
  };

  accounts.forEach((account) => {
    if (balancesByType[account.type]) {
      balancesByType[account.type].accounts.push({
        _id: account._id,
        name: account.name,
        currentBalance: account.currentBalance,
        openingBalance: account.openingBalance,
      });
      balancesByType[account.type].totalBalance += account.currentBalance;
    }
  });

  // Calculate overall totals
  const totalCashAccounts = 
    balancesByType.cashier.totalBalance + 
    balancesByType.safe.totalBalance + 
    balancesByType.saraf.totalBalance;

  const totalSupplierDebt = balancesByType.supplier.totalBalance; // Positive = you owe them
  const totalCustomerCredit = balancesByType.customer.totalBalance; // Positive = they owe you

  res.status(200).json({
    success: true,
    data: {
      byType: balancesByType,
      summary: {
        totalCashAccounts,
        totalSupplierDebt,
        totalCustomerCredit,
        netPosition: totalCashAccounts + totalCustomerCredit - totalSupplierDebt,
      },
    },
  });
});

// @desc    Get total transaction volume for an account
// @route   GET /api/v1/accounts/:id/transaction-volume
exports.getAccountTransactionVolume = asyncHandler(async (req, res, next) => {
  const accountId = req.params.id;

  const account = await Account.findOne({ _id: accountId, isDeleted: false });
  if (!account) throw new AppError('Account not found', 404);

  const AccountTransaction = require('../models/accountTransaction.model');

  // Get all transactions for this account
  const transactions = await AccountTransaction.find({
    account: accountId,
    isDeleted: false,
    reversed: { $ne: true },
  }).select('amount');

  let totalVolume = 0;

  if (account.type === 'customer') {
    // For customers: sum all negative amounts (money received from customer)
    totalVolume = transactions.reduce((sum, tx) => {
      return sum + (tx.amount < 0 ? Math.abs(tx.amount) : 0);
    }, 0);
  } else if (account.type === 'supplier') {
    // For suppliers: sum all positive amounts (money paid to supplier)
    totalVolume = transactions.reduce((sum, tx) => {
      return sum + (tx.amount > 0 ? tx.amount : 0);
    }, 0);
  }

  res.status(200).json({
    success: true,
    data: {
      accountId: account._id,
      accountName: account.name,
      accountType: account.type,
      totalTransactionVolume: totalVolume,
    },
  });
});

// @desc    Get cash flow report (money in vs out over time)
// @route   GET /api/v1/accounts/reports/cashflow
exports.getCashFlowReport = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, groupBy = 'day' } = req.query;

  if (!startDate || !endDate) {
    throw new AppError('Start date and end date are required', 400);
  }

  const AccountTransaction = require('../models/accountTransaction.model');

  // Get all transactions in date range from cash accounts only (cashier, safe, saraf)
  const cashAccountTypes = ['cashier', 'safe', 'saraf'];
  const cashAccounts = await Account.find({
    type: { $in: cashAccountTypes },
    isDeleted: false,
  }).select('_id');

  const cashAccountIds = cashAccounts.map(acc => acc._id);

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
        'Invalid groupBy parameter. Must be day, week, or month',
        400
      );
  }

  // Get cash flow data grouped by period
  const cashFlowData = await AccountTransaction.aggregate([
    {
      $match: {
        isDeleted: false,
        reversed: { $ne: true },
        account: { $in: cashAccountIds },
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      },
    },
    {
      $group: {
        ...groupStage,
        moneyIn: {
          $sum: {
            $cond: [{ $gt: ['$amount', 0] }, '$amount', 0],
          },
        },
        moneyOut: {
          $sum: {
            $cond: [{ $lt: ['$amount', 0] }, { $abs: ['$amount'] }, 0],
          },
        },
        transactionCount: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
  ]);

  // Format dates for frontend
  const formattedData = cashFlowData.map(item => {
    let dateLabel;
    if (groupBy === 'day') {
      dateLabel = `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`;
    } else if (groupBy === 'week') {
      dateLabel = `Week ${item._id.week}, ${item._id.year}`;
    } else if (groupBy === 'month') {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      dateLabel = `${monthNames[item._id.month - 1]} ${item._id.year}`;
    }
    
    return {
      date: dateLabel,
      moneyIn: item.moneyIn,
      moneyOut: item.moneyOut,
      netFlow: item.moneyIn - item.moneyOut,
      transactionCount: item.transactionCount,
    };
  });

  // Calculate totals
  const totals = formattedData.reduce(
    (acc, item) => {
      acc.totalIn += item.moneyIn;
      acc.totalOut += item.moneyOut;
      acc.totalTransactions += item.transactionCount;
      return acc;
    },
    { totalIn: 0, totalOut: 0, totalTransactions: 0 }
  );

  totals.netFlow = totals.totalIn - totals.totalOut;

  res.status(200).json({
    success: true,
    data: {
      period: { startDate, endDate },
      groupBy,
      summary: formattedData,
      totals,
    },
  });
});