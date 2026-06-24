const mongoose = require('mongoose');
const asyncHandler = require('../middlewares/asyncHandler');
const AppError = require('../utils/AppError');
const Account = require('../models/account.model');
const AccountTransaction = require('../models/accountTransaction.model');
const AuditLog = require('../models/auditLog.model');
const Purchase = require('../models/purchase.model');
const Sale = require('../models/sale.model');
const {
  canReverseAccountTransaction,
  collectTransactionsToReverse,
} = require('../utils/accountTransactionReverse');

// @desc Get all account transactions with pagination and filters
// @route GET /api/v1/account-transactions
exports.getAllTransactions = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    sortBy,
    sortOrder = 'desc',
    accountId,
    transactionType,
    type,
    referenceType,
    minAmount,
    maxAmount,
    isReversed,
    search,
    startDate,
    endDate,
  } = req.query;

  // Build query object
  const query = { isDeleted: false };

  // Filter by account
  if (accountId) {
    query.account = accountId;
  }

  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  // Filter by transaction type
  const resolvedTransactionType = transactionType || type;
  if (resolvedTransactionType) {
    query.transactionType = resolvedTransactionType;
  }

  // Filter by reference type
  if (referenceType) {
    query.referenceType = referenceType;
  }

  // Filter by date range
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  // Filter by amount range
  if (minAmount !== undefined || maxAmount !== undefined) {
    query.amount = {};
    if (minAmount !== undefined) query.amount.$gte = parseFloat(minAmount);
    if (maxAmount !== undefined) query.amount.$lte = parseFloat(maxAmount);
  }

  // Filter by reversal status
  if (isReversed !== undefined) {
    query.reversed = isReversed === 'true';
  }

  // Search in description
  if (search) {
    query.description = { $regex: search, $options: 'i' };
  }

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build sort object
  const sort = {};
  sort.createdAt = sortOrder === 'desc' ? -1 : 1;
  if (sortBy && sortBy !== 'createdAt') {
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
  } else {
    sort.date = sortOrder === 'desc' ? -1 : 1;
  }

  // Execute query with pagination
  const transactions = await AccountTransaction.find(query)
    .populate('account', 'name type')
    .populate('created_by', 'name')
    .populate('reversedBy', 'name')

    .sort(sort)
    .skip(skip)
    .limit(limitNum);

  // Add paired account and reference data for transactions with referenceId
  for (let tx of transactions) {
    if (tx.referenceId) {
      const paired = await AccountTransaction.findOne({
        _id: { $ne: tx._id },
        referenceId: tx.referenceId,
        isDeleted: false,
      }).populate('account', 'name type');
      if (paired) {
        tx.pairedAccount = paired.account;
      }

      // Populate reference data based on referenceType
      if (tx.referenceType === 'purchase') {
        const purchase = await Purchase.findById(tx.referenceId)
          .select('supplierName supplier purchaseDate totalAmount')
          .populate('supplier', 'name');
        if (purchase) {
          tx.referenceData = purchase;
          const supplierLabel =
            purchase.supplierName ||
            purchase.supplier?.name ||
            'Unknown';
          tx.referenceData.reference = `رانیول - ${supplierLabel}`;
        }
      } else if (tx.referenceType === 'sale') {
        const sale = await Sale.findById(tx.referenceId)
          .select('saleNumber customer totalAmount')
          .populate('customer', 'name');
        if (sale) {
          tx.referenceData = sale;
          tx.referenceData.reference = `پلور ${sale.saleNumber} - ${sale.customer?.name || 'Unknown'}`;
        }
      } else if (tx.referenceType) {
        // For any other referenceType, attempt to populate name if the model has it
        // This is a general fallback, assuming the referenceId points to a document with a 'name' field
        try {
          const Model = require(`../models/${tx.referenceType}.model`);
          if (Model) {
            const doc = await Model.findById(tx.referenceId).select('name');
            if (doc && doc.name) {
              tx.referenceData = { name: doc.name, reference: doc.name };
            }
          }
        } catch (error) {
          // Ignore errors for unknown models
        }
      }
    }

    tx.canReverse = canReverseAccountTransaction(tx).allowed;
  }

  // Get total count for pagination
  const totalTransactions = await AccountTransaction.countDocuments(query);
  const totalPages = Math.ceil(totalTransactions / limitNum);

  // Calculate summary statistics
  const summaryPipeline = [
    { $match: query },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        totalCredit: {
          $sum: { $cond: [{ $gt: ['$amount', 0] }, '$amount', 0] },
        },
        totalDebit: {
          $sum: { $cond: [{ $lt: ['$amount', 0] }, '$amount', 0] },
        },
        avgAmount: { $avg: '$amount' },
        maxAmount: { $max: '$amount' },
        minAmount: { $min: '$amount' },
      },
    },
  ];

  const summary = await AccountTransaction.aggregate(summaryPipeline);

  res.status(200).json({
    success: true,
    data: {
      transactions,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalTransactions,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
        limit: limitNum,
      },
      summary: summary[0] || {
        totalAmount: 0,
        totalCredit: 0,
        totalDebit: 0,
        avgAmount: 0,
        maxAmount: 0,
        minAmount: 0,
      },
      filters: {
        accountId,
        transactionType,
        referenceType,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        isReversed,
        search,
        sortBy,
        sortOrder,
      },
    },
  });
});

// @desc Get Ledger of a specific account
// @route GET /api/v1/accounts/:id/ledger
exports.getAccountLedger = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { startDate, endDate, type, sortOrder = 'desc', includeAll = 'false' } = req.query;
  const account = await Account.findById(id);
  if (!account || account.isDeleted)
    throw new AppError('حساب ونه موندل شو', 404);

  // Populate supplier/customer/saraf details if account has refId
  let contactInfo = null;
  if (account.refId) {
    if (account.type === 'supplier') {
      const Supplier = require('../models/supplier.model');
      const supplier = await Supplier.findById(account.refId).select('name contact_info');
      if (supplier) {
        contactInfo = {
          name: supplier.name,
          phone: supplier.contact_info?.phone || null,
          email: supplier.contact_info?.email || null,
        };
      }
    } else if (account.type === 'customer') {
      const Customer = require('../models/customer.model');
      const customer = await Customer.findById(account.refId).select('name contact_info');
      if (customer) {
        contactInfo = {
          name: customer.name,
          phone: customer.contact_info?.phone || null,
          email: customer.contact_info?.email || null,
        };
      }
    } else if (account.type === 'saraf') {
      const Saraf = require('../models/saraf.model');
      const saraf = await Saraf.findById(account.refId).select('name contact_info');
      if (saraf) {
        contactInfo = {
          name: saraf.name,
          phone: saraf.contact_info?.phone || null,
          email: saraf.contact_info?.email || null,
        };
      }
    }
  }

  const query = { account: id, isDeleted: false, reversed: { $ne: true } };

  const hasValidStart = startDate && !Number.isNaN(new Date(startDate).getTime());
  const hasValidEnd = endDate && !Number.isNaN(new Date(endDate).getTime());

  if (hasValidStart || hasValidEnd) {
    query.date = {};

    if (hasValidStart) {
      query.date.$gte = new Date(startDate);
    }

    if (hasValidEnd) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.date.$lte = end;
    }
  }

  if (type) query.transactionType = type;

  const sortDirection = sortOrder === 'desc' ? -1 : 1;
  const transactions = await AccountTransaction.find(query)
    .populate('created_by', 'name')
    .sort({ createdAt: sortDirection, date: sortDirection, _id: sortDirection });

  let runningBalance =
    sortOrder === 'desc' ? account.currentBalance : account.openingBalance;

  const ledger = transactions.map((txn) => {
    let balanceAfter;
    if (sortOrder === 'desc') {
      balanceAfter = runningBalance;
      runningBalance -= txn.amount;
    } else {
      runningBalance += txn.amount;
      balanceAfter = runningBalance;
    }

    return {
      date: txn.date,
      type: txn.transactionType,
      amount: txn.amount,
      description: txn.description,
      balanceAfter,
      referenceType: txn.referenceType,
      referenceId: txn.referenceId,
      transactionId: txn._id,
    };
  });

  res.status(200).json({
    success: true,
    account: account.name,
    accountType: account.type,
    openingBalance: account.openingBalance,
    currentBalance: account.currentBalance,
    totalTransactions: transactions.length,
    contactInfo, // Include contact info
    ledger,
    sortOrder,
  });
});

// Helper function to validate account balance
const validateAccountBalance = async (accountId, requiredAmount, session) => {
  const account = await Account.findById(accountId).session(session);
  if (!account) throw new AppError('Account not found', 404);

  if (requiredAmount > 0) {
    // Only validate cashier and safe accounts - they cannot go negative
    if (account.type === 'cashier' || account.type === 'safe') {
      if (account.currentBalance < requiredAmount) {
        throw new AppError(
          `ناکافي موجودي! د ${account.name} په حساب کې موجودي: ${account.currentBalance.toLocaleString()} افغانۍ، اړتیا مقدار: ${requiredAmount.toLocaleString()} افغانۍ`,
          400
        );
      }
    }
    // Saraf account can go negative (credit account), so no validation needed
  }

  return account;
};

// @desc Add manual transaction for customer/supplier with system account
// @route POST /api/v1/account-transactions
exports.createManualTransaction = asyncHandler(async (req, res, next) => {
  const { accountId, systemAccountId, transactionType, amount, description } = req.body;

  if (!accountId || !systemAccountId || !transactionType || !amount)
    throw new AppError('حساب، سیسټم حساب، د معاملې ډول او اندازه اړینه ده', 400);

  if (amount <= 0)
    throw new AppError('اندازه باید مثبته وي', 400);

  // Validate accounts exist (without session)
  const accountCheck = await Account.findById(accountId);
  const systemAccountCheck = await Account.findById(systemAccountId);

  if (!accountCheck || accountCheck.isDeleted) throw new AppError('حساب ونه موندل شو', 404);
  if (!systemAccountCheck || systemAccountCheck.isDeleted) throw new AppError('سیسټم حساب ونه موندل شو', 404);

  // Validate account types
  if (!['customer', 'supplier', 'employee'].includes(accountCheck.type)) {
    throw new AppError('دا معامله یوازې د پیرودونکو، عرضه کوونکو او کارمندانو لپاره ده', 400);
  }

  if (!['cashier', 'safe'].includes(systemAccountCheck.type)) {
    throw new AppError('سیسټم حساب باید دخل، تجری یا صراف وي', 400);
  }

  // Validate transaction type based on account type
  if ((accountCheck.type === 'customer' || accountCheck.type === 'employee') && transactionType !== 'Debit') {
    throw new AppError('د پیرودونکي/کارمند لپاره یوازې ډیبټ (د پیسو ترلاسه کول) اجازه ده', 400);
  }

  if (accountCheck.type === 'supplier' && transactionType !== 'Credit') {
    throw new AppError('د عرضه کوونکي لپاره یوازې کریډیټ (د پیسو ورکول) اجازه ده', 400);
  }

  // Validate system account balance for supplier payment
  if (accountCheck.type === 'supplier') {
    if (systemAccountCheck.currentBalance < amount) {
      throw new AppError(
        `د ${systemAccountCheck.name} کافي بیلانس نشته. اوسنی بیلانس: ${systemAccountCheck.currentBalance}`,
        400
      );
    }
  }

  const session = await mongoose.startSession();

  try {
    const result = await session.withTransaction(async () => {
      // Refetch accounts inside transaction with session
      const account = await Account.findById(accountId).session(session);
      const systemAccount = await Account.findById(systemAccountId).session(session);

      const transferGroupId = new mongoose.Types.ObjectId();

      let customerSupplierAmount, systemAccountAmount;

      if (account.type === 'customer' || account.type === 'employee') {
        // Customer/Employee: Receive payment (Debit) - money comes in, balance decreases
        customerSupplierAmount = -amount;
        systemAccountAmount = amount;
      } else if (account.type === 'supplier') {
        // Supplier: Make payment (Credit) - money goes out, balance decreases
        customerSupplierAmount = -amount;
        systemAccountAmount = -amount;
      }

      const mainTransaction = await AccountTransaction.create(
        [
          {
            account: account._id,
            transactionType,
            amount: customerSupplierAmount,
            referenceType: 'payment',
            referenceId: transferGroupId,
            description: description || `${transactionType} - ${systemAccount.name}`,
            created_by: req.user._id,
          },
        ],
        { session }
      );

      const systemTransaction = await AccountTransaction.create(
        [
          {
            account: systemAccount._id,
            transactionType: systemAccountAmount > 0 ? 'Credit' : 'Debit',
            amount: systemAccountAmount,
            referenceType: 'payment',
            referenceId: transferGroupId,
            description: description || `${account.type === 'customer' || account.type === 'employee' ? 'له' : 'ته'} ${account.name}`,
            created_by: req.user._id,
          },
        ],
        { session }
      );

      account.currentBalance += customerSupplierAmount;
      systemAccount.currentBalance += systemAccountAmount;

      await account.save({ session });
      await systemAccount.save({ session });

      await AuditLog.create(
        [
          {
            tableName: 'AccountTransaction',
            recordId: transferGroupId,
            operation: 'INSERT',
            oldData: null,
            newData: {
              account: account.name,
              systemAccount: systemAccount.name,
              amount,
              type: transactionType,
            },
            reason: description || 'لاسي تادیه معامله',
            changedBy: req.user?.name || 'System',
            changedAt: new Date(),
          },
        ],
        { session }
      );

      return { 
        mainTransaction: mainTransaction[0], 
        systemTransaction: systemTransaction[0],
        accountName: account.name,
        accountBalance: account.currentBalance,
        systemAccountName: systemAccount.name,
        systemAccountBalance: systemAccount.currentBalance
      };
    });

    res.status(201).json({
      success: true,
      message: 'معامله په بریالیتوب سره ثبت شوه',
      data: {
        mainTransaction: result.mainTransaction,
        systemTransaction: result.systemTransaction,
        account: {
          name: result.accountName,
          newBalance: result.accountBalance,
        },
        systemAccount: {
          name: result.systemAccountName,
          newBalance: result.systemAccountBalance,
        },
      },
    });
  } catch (err) {
    throw new AppError(err.message, 500);
  } finally {
    await session.endSession();
  }
});

// @desc Transfer money between two accounts (Double-entry)
// @route POST /api/v1/account-transactions/transfer
exports.transferBetweenAccounts = asyncHandler(async (req, res, next) => {
  const { fromAccountId, toAccountId, amount, description } = req.body;

  if (!fromAccountId || !toAccountId || !amount)
    throw new AppError('د سرچینې حساب، منزل حساب او اندازه اړینه ده', 400);

  if (fromAccountId === toAccountId)
    throw new AppError('تاسو نشئ کولی ورته حساب ته پیسې انتقال کړئ', 400);

  // Validate accounts exist (without session)
  const fromAccountCheck = await Account.findById(fromAccountId);
  const toAccountCheck = await Account.findById(toAccountId);

  if (!fromAccountCheck || fromAccountCheck.isDeleted)
    throw new AppError('د سرچینې حساب ونه موندل شو', 404);
  if (!toAccountCheck || toAccountCheck.isDeleted)
    throw new AppError('د منزل حساب ونه موندل شو', 404);

  // Validate balance (only for cashier/safe accounts)
  if (fromAccountCheck.type === 'cashier' || fromAccountCheck.type === 'safe') {
    if (fromAccountCheck.currentBalance < amount) {
      throw new AppError(
        `ناکافي موجودي! د ${fromAccountCheck.name} په حساب کې موجودي: ${fromAccountCheck.currentBalance.toLocaleString()} افغانۍ، اړتیا مقدار: ${amount.toLocaleString()} افغانۍ`,
        400
      );
    }
  } else if (fromAccountCheck.currentBalance < amount) {
    throw new AppError('د سرچینې حساب کې کافي بیلانس نشته', 400);
  }

  const session = await mongoose.startSession();

  try {
    const result = await session.withTransaction(async () => {
      // Refetch accounts inside transaction with session
      const fromAccount = await Account.findById(fromAccountId).session(session);
      const toAccount = await Account.findById(toAccountId).session(session);

      const transferGroupId = new mongoose.Types.ObjectId();

      const debitTx = await AccountTransaction.create(
        [
          {
            account: fromAccount._id,
            transactionType: 'Transfer',
            amount: -Math.abs(amount),
            referenceType: 'transfer',
            referenceId: transferGroupId,
            description:
              description ||
              `انتقال ته ${toAccount.name || toAccount.type.toUpperCase()}`,
            created_by: req.user._id,
          },
        ],
        { session }
      );

      const creditTx = await AccountTransaction.create(
        [
          {
            account: toAccount._id,
            transactionType: 'Transfer',
            amount: Math.abs(amount),
            referenceType: 'transfer',
            referenceId: transferGroupId,
            description:
              description ||
              `ترلاسه له ${fromAccount.name || fromAccount.type.toUpperCase()}`,
            created_by: req.user._id,
          },
        ],
        { session }
      );

      fromAccount.currentBalance -= amount;
      toAccount.currentBalance += amount;

      await fromAccount.save({ session });
      await toAccount.save({ session });

      await AuditLog.create(
        [
          {
            tableName: 'AccountTransaction',
            recordId: debitTx[0]._id,
            operation: 'INSERT',
            oldData: null,
            newData: debitTx[0].toObject(),
            reason: description || 'د حساب څخه حساب ته انتقال',
            changedBy: req.user?.name || 'System',
            changedAt: new Date(),
          },
          {
            tableName: 'AccountTransaction',
            recordId: creditTx[0]._id,
            operation: 'INSERT',
            oldData: null,
            newData: creditTx[0].toObject(),
            reason: description || 'د حساب څخه حساب ته انتقال',
            changedBy: req.user?.name || 'System',
            changedAt: new Date(),
          },
        ],
        { session }
      );

      return { 
        debitTx: debitTx[0], 
        creditTx: creditTx[0],
        fromName: fromAccount.name,
        toName: toAccount.name
      };
    });

    res.status(201).json({
      success: true,
      message: 'لیږد په بریالیتوب سره بشپړ شو',
      transfer: {
        from: result.fromName,
        to: result.toName,
        amount,
        debitTransaction: result.debitTx,
        creditTransaction: result.creditTx,
      },
    });
  } catch (err) {
    throw new AppError(err.message || 'د پیسو انتقال ناکام شو', 500);
  } finally {
    await session.endSession();
  }
});

// @desc    Reverse an account transaction (safe rollback)
// @route   POST /api/v1/account-transactions/:id/reverse
exports.reverseTransaction = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const txnId = req.params.id;
    const reason = req.body.reason || `د معاملې بیرته کول ${txnId}`;

    await session.startTransaction();

    const orig = await AccountTransaction.findById(txnId).session(session);
    if (!orig || orig.isDeleted)
      throw new AppError('معامله ونه موندل شوه', 404);

    const transactionsToReverse = await collectTransactionsToReverse(
      session,
      orig
    );

    const reversals = [];

    for (const tx of transactionsToReverse) {
      const acc = await Account.findById(tx.account).session(session);
      if (!acc || acc.isDeleted) throw new AppError('حساب ونه موندل شو', 404);

      const revAmount = -tx.amount;
      const rev = await AccountTransaction.create(
        [
          {
            account: acc._id,
            date: new Date(),
            transactionType: revAmount < 0 ? 'Debit' : 'Credit',
            amount: revAmount,
            reversesTransaction: tx._id,
            description: `بیرته کول: ${reason}`,
            created_by: req.user._id,
            isDeleted: false,
          },
        ],
        { session }
      );

      acc.currentBalance += -tx.amount;
      await acc.save({ session });

      tx.reversed = true;
      tx.reversalTransaction = rev[0]._id;
      tx.reversedBy = req.user._id;
      tx.reversedAt = new Date();
      await tx.save({ session });

      await AuditLog.create(
        [
          {
            tableName: 'AccountTransaction',
            recordId: tx._id,
            operation: 'DELETE',
            oldData: tx.toObject(),
            newData: { reversed: true, reversalTransaction: rev[0]._id },
            reason,
            changedBy: req.user?.name || 'System',
          },
        ],
        { session }
      );

      reversals.push(rev[0]);
    }

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: 'معامله په بریالیتوب سره بیرته شوه',
      reversals,
    });
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw new AppError(err.message || 'معامله بیرته کول ناکام شو', 500);
  } finally {
    await session.endSession();
  }
});
