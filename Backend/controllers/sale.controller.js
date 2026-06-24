const mongoose = require('mongoose');
const Sale = require('../models/sale.model');
const SaleItem = require('../models/saleItem.model');
const SaleReturn = require('../models/saleReturn.model');
const Stock = require('../models/stock.model');
const Product = require('../models/product.model');
const Unit = require('../models/unit.model');
const {
  convertToBaseUnit,
  convertFromBaseUnit,
} = require('../utils/unitConversion');
const asyncHandler = require('../middlewares/asyncHandler');
const AppError = require('../utils/AppError');
const {
  parseDeletionFilter,
  markSoftDeleted,
  markRestored,
  validateObjectId,
} = require('../utils/softDeleteHelpers');
const {
  undoSaleAccountTransactions,
  redoSaleAccountTransactions,
} = require('../utils/saleTrashAccounts');
const {
  createSaleSchema,
  updateSaleSchema,
  createSaleReturnSchema,
  updateSaleReturnSchema,
} = require('../validations');
const {
  resolveStoreReturnBatch,
  resolveEmployeeReturnBatch,
  getStockBatchMeta,
  applyStoreReturnStock,
  mapRestoredBatchesForStorage,
  reverseStoreReturnStock,
  reverseEmployeeReturnStock,
  incrementStoreStock,
  decrementStoreStock,
  incrementEmployeeStock,
  assertReturnQuantityAllowed,
  assertRefundAmountAllowed,
  applySaleReturnAccounts,
  applySaleItemReturnDeduction,
  revertSaleItemReturnDeduction,
  computeLineRefundPreDiscount,
  computeEffectiveCustomerRefund,
  applySaleTotalsAfterReturn,
  getActiveSaleItems,
  resolveReturnLineRefund,
  resolveReceivableReturnCredit,
  computeRequiredCashRefund,
  getPostedReceivableCredit,
  sumActiveItemsSubtotal,
  toBaseQty,
  assertNoActiveSaleReturns,
} = require('../utils/saleReturnHelpers');
const Account = require('../models/account.model');
const AccountTransaction = require('../models/accountTransaction.model');
const AuditLog = require('../models/auditLog.model');
const EmployeeStock = require('../models/employeeStock.model');
const Customer = require('../models/customer.model');
const { getOrCreateAccount } = require('../utils/accountHelper');
const {
  buildSaleDateFilter,
  normalizeSaleDateInput,
} = require('../utils/dateRange');
const {
  restoreSaleItemStock,
  deductSaleLineStock,
  buildSaleItemPayload,
  saleItemCostExpr,
} = require('../utils/saleItemStock');
const {
  toStockQuantity,
  loadPrimaryUnitForProduct,
} = require('../utils/primaryUnitStock');

const resolveSaleTotals = (itemsSubtotal, discountAmount, paidAmount) => {
  const subtotal = Math.max(0, Number(itemsSubtotal) || 0);
  const discount = Math.max(0, Number(discountAmount) || 0);
  const paid = Math.max(0, Number(paidAmount) || 0);

  if (discount > subtotal) {
    throw new AppError('تخفیف باید له ټولې اندازې څخه زیات نه وي', 400);
  }

  const totalAmount = subtotal - discount;
  if (paid > totalAmount) {
    throw new AppError(
      'ورکړل شوې اندازه له ټولې اندازې (د تخفیف وروسته) څخه زیاته ده',
      400
    );
  }

  return {
    subtotalAmount: subtotal,
    discountAmount: discount,
    totalAmount,
    dueAmount: Math.max(0, totalAmount - paid),
  };
};

// Helper function to validate account balance
const validateAccountBalance = async (accountId, requiredAmount, session) => {
  const account = await Account.findById(accountId).session(session);
  if (!account) throw new AppError('حساب ونه موندل شو', 404);
  
  if (requiredAmount > 0) {
    // Only validate cashier and safe accounts - they cannot go negative
    if (account.type === 'cashier' || account.type === 'safe') {
      if (account.currentBalance < requiredAmount) {
        throw new AppError(
          `ناکافي موجودي! په ${account.name} حساب کې موجودي: ${account.currentBalance.toLocaleString()} افغانۍ، اړین مقدار: ${requiredAmount.toLocaleString()} افغانۍ`,
          400
        );
      }
    }
    // Saraf account can go negative (credit account), so no validation needed
  }
  
  return account;
};

// @desc Create a sale (transactional)
// @route POST /api/v1/sales
exports.createSale = asyncHandler(async (req, res, next) => {
  const { error } = createSaleSchema.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      customer,
      employee, // optional: riding man employee id
      saleDate,
      items,
      paidAmount = 0,
      discountAmount = 0,
      placedIn,
      invoiceType = 'small',
      description,
    } = req.body;

    // Receipt account only when receiving money now (credit sales use POST /sales/:id/payment)
    let account = null;
    if (paidAmount > 0) {
      if (!placedIn) {
        throw new AppError('د تادیې لپاره حساب (دخل/تجري/صراف) اړین دی', 400);
      }
      account = await Account.findById(placedIn).session(session);
      if (!account) {
        throw new AppError('د پیسو د ځای په ځای کولو لپاره ناسم حساب (placedIn)', 400);
      }
    }

    // Prepare customer account (if provided) before creating sale so it participates in the transaction
    let customerAccount = null;
    let customerNameSnapshot = '';
    if (customer) {
      const customerDoc = await Customer.findById(customer).session(session);
      if (!customerDoc) throw new AppError('ناسم پیرودونکی ID', 400);
      customerNameSnapshot = customerDoc.name;
      customerAccount = await getOrCreateAccount({
        refId: customer,
        type: 'customer',
        name: customerDoc.name,
        session,
      });
    }

    // create skeleton sale first so SaleItem can reference sale._id
    const saleDocs = await Sale.create(
      [
        {
          customer: customer || null,
          customerAccount: customerAccount?._id,
          customerName: customerNameSnapshot || undefined,
          employee: employee || null,
          saleDate: normalizeSaleDateInput(saleDate) || new Date(),
          totalAmount: 0, // will update later
          paidAmount,
          dueAmount: 0, // will update later
          placedIn: paidAmount > 0 ? placedIn : null,
          invoiceType,
          description: description || undefined,
          soldBy: req.user?._id || null,
        },
      ],
      { session }
    );
    const saleDoc = saleDocs[0];

    let itemsSubtotal = 0;
    let totalProfit = 0;

    // Process each sale item (deduct stock, compute cost & profit, create saleItem)
    for (const item of items) {
      const product = await Product.findById(item.product)
        .populate('baseUnit', 'name')
        .session(session);
      if (!product)
        throw new AppError(`ناسم محصول ID: ${item.product}`, 400);

      const unit = await Unit.findById(item.unit).session(session);
      if (!unit) throw new AppError('ناسم واحد ID', 400);

      const { totalCost, batchesUsed, baseQty } = await deductSaleLineStock({
        session,
        employeeId: employee || null,
        item,
        product,
        unit,
      });

      const saleRevenue = item.unitPrice * item.quantity;
      const profit = saleRevenue - totalCost;

      itemsSubtotal += saleRevenue;
      totalProfit += profit;

      await SaleItem.create(
        [
          buildSaleItemPayload({
            saleId: saleDoc._id,
            product,
            unit,
            item,
            totalCost,
            batchesUsed,
            baseQty,
          }),
        ],
        { session }
      );
    } // end for items

    const totals = resolveSaleTotals(itemsSubtotal, discountAmount, paidAmount);
    totalProfit -= totals.discountAmount;

    // update sale totals & due
    saleDoc.subtotalAmount = totals.subtotalAmount;
    saleDoc.discountAmount = totals.discountAmount;
    saleDoc.totalAmount = totals.totalAmount;
    saleDoc.paidAmount = paidAmount;
    saleDoc.dueAmount = totals.dueAmount;
    await saleDoc.save({ session });

    const totalAmount = totals.totalAmount;

    // 3️⃣ ACCOUNT TRANSACTIONS
    // Prepare references for accounts to reuse in payment section
    // Customer debit (if customer provided) — customer owes totalAmount
    if (customer) {
      // we already ensured customerAccount via getOrCreateAccount earlier and stored it on saleDoc
      if (!customerAccount) {
        // As a fallback, try to find or create now
        const customerDoc = await Customer.findById(customer).session(session);
        const tmpName = customerDoc ? customerDoc.name : '';
        customerAccount = await getOrCreateAccount({ refId: customer, type: 'customer', name: tmpName, session });
      }

      await AccountTransaction.create(
        [
          {
            account: customerAccount._id,
            transactionType: 'Sale',
            amount: totalAmount,
            referenceType: 'sale',
            referenceId: saleDoc._id,
            description: `فروش به مشتری ${customerAccount.name} - بل نمبر: ${saleDoc.billNumber || 'N/A'}`,
            created_by: req.user?._id,
          },
        ],
        { session }
      );

      customerAccount.currentBalance += totalAmount;
      await customerAccount.save({ session });
    }

    // Employee debit (if employee provided) — employee owes totalAmount
    let employeeAccountDoc = null;
    if (employee) {
      employeeAccountDoc = await Account.findOne({
        refId: employee,
        type: 'employee',
      }).session(session);
      if (!employeeAccountDoc)
        throw new AppError('د کارکوونکي حساب ونه موندل شو', 404);

      await AccountTransaction.create(
        [
          {
            account: employeeAccountDoc._id,
            transactionType: 'Sale',
            amount: totalAmount,
            referenceType: 'sale',
            referenceId: saleDoc._id,
            description: `فروش به کارمند ${employeeAccountDoc.name} - بل نمبر: ${saleDoc.billNumber || 'N/A'}`,
            created_by: req.user?._id,
          },
        ],
        { session }
      );

      employeeAccountDoc.currentBalance += totalAmount;
      await employeeAccountDoc.save({ session });
    }

    // Payment account credit (Dakhal / Tajri / Saraf) - Customer pays you
    if (paidAmount > 0) {
      // Payment increases cashier balance (you receive money)
      await AccountTransaction.create(
        [
          {
            account: account._id,
            transactionType: 'Payment',
            amount: paidAmount,
            referenceType: 'sale',
            referenceId: saleDoc._id,
            description: `پرداخت فروش در ${account.name} - بل نمبر: ${saleDoc.billNumber || 'N/A'}`,
            created_by: req.user?._id,
          },
        ],
        { session }
      );

      account.currentBalance += paidAmount;
      await account.save({ session });

      // Payment reduces customer balance (their debt decreases)
      if (customer && customerAccount) {
        await AccountTransaction.create(
          [
            {
              account: customerAccount._id,
              transactionType: 'Payment',
              amount: -paidAmount,
              referenceType: 'sale',
              referenceId: saleDoc._id,
              description: `پرداخت برای فروش - بل نمبر: ${saleDoc.billNumber || 'N/A'}`,
              created_by: req.user?._id,
            },
          ],
          { session }
        );

        customerAccount.currentBalance -= paidAmount;
        await customerAccount.save({ session });
      }

      // Payment reduces employee balance (their debt decreases)
      if (employee && employeeAccountDoc) {
        await AccountTransaction.create(
          [
            {
              account: employeeAccountDoc._id,
              transactionType: 'Payment',
              amount: -paidAmount,
              referenceType: 'sale',
              referenceId: saleDoc._id,
              description: `پرداخت برای فروش (کارمند) - بل نمبر: ${saleDoc.billNumber || 'N/A'}`,
              created_by: req.user?._id,
            },
          ],
          { session }
        );

        employeeAccountDoc.currentBalance -= paidAmount;
        await employeeAccountDoc.save({ session });
      }
    }

    // 4️⃣ Audit Log
    await AuditLog.create(
      [
        {
          tableName: 'Sale',
          recordId: saleDoc._id,
          operation: 'INSERT',
          oldData: null,
          newData: { sale: saleDoc, totalProfit },
          reason: 'New sale created',
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // Respond with sale (populate if desired on client)
    res.status(201).json({
      success: true,
      message: 'پلور په بریالیتوب سره جوړ شو',
      sale: saleDoc,
      totalProfit,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    // prefer rethrowing known AppError messages
    throw new AppError(err.message || 'د پلور په جوړولو کې ناکامي', 500);
  }
});

/**
 * @desc    Get all sales (pagination + filtering)
 * @route   GET /api/v1/sales
 */
exports.getAllSales = asyncHandler(async (req, res, next) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const {
    customer,
    employee,
    fromDate,
    toDate,
    invoiceType,
    minTotal,
    maxTotal,
    status,
  } = req.query;

  const query = parseDeletionFilter(req.query);

  // 🧭 Dynamic filters
  if (customer) query.customer = customer;
  if (employee) query.employee = employee;
  if (invoiceType) query.invoiceType = invoiceType;
  if (minTotal || maxTotal) {
    query.totalAmount = {};
    if (minTotal) query.totalAmount.$gte = Number(minTotal);
    if (maxTotal) query.totalAmount.$lte = Number(maxTotal);
  }
  const saleDateRange = buildSaleDateFilter(fromDate, toDate);
  if (saleDateRange) query.saleDate = saleDateRange;
  
  // Payment status filter
  if (status === 'paid') {
    query.dueAmount = { $eq: 0 };
  } else if (status === 'partial') {
    query.dueAmount = { $gt: 0 };
    query.paidAmount = { $gt: 0 };
  } else if (status === 'pending') {
    query.dueAmount = { $gt: 0 };
    query.paidAmount = { $eq: 0 };
  }

  const [sales, total, profitAgg] = await Promise.all([
    Sale.find(query)
      .populate('customerAccount', 'name')
      .populate('employeeAccount', 'name')
      .populate('soldBy', 'name')
      .populate('placedIn', 'name type')
      .skip(skip)
      .limit(limit)
      .sort({ saleDate: -1, createdAt: -1 })
      .lean(),
    Sale.countDocuments(query),
    // 📊 Profit summary for visible page
    SaleItem.aggregate([
      {
        $lookup: {
          from: 'sales',
          localField: 'sale',
          foreignField: '_id',
          as: 'sale',
        },
      },
      { $unwind: '$sale' },
      {
        $match: {
          isDeleted: false,
          'sale.isDeleted': false,
          ...(query.customer && { 'sale.customer': query.customer }),
          ...(query.employee && { 'sale.employee': query.employee }),
          ...(query.invoiceType && { 'sale.invoiceType': query.invoiceType }),
          ...(query.saleDate && { 'sale.saleDate': query.saleDate }),
          ...(query.dueAmount !== undefined && {
            'sale.dueAmount': query.dueAmount,
          }),
          ...(query.totalAmount && { 'sale.totalAmount': query.totalAmount }),
        },
      },
      { $group: { _id: null, totalProfit: { $sum: '$profit' } } },
    ]),
  ]);

  const totalProfit = profitAgg[0]?.totalProfit || 0;

  res.status(200).json({
    status: 'success',
    results: sales.length,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
    },
    summary: {
      totalProfit,
      totalSalesAmount: sales.reduce((acc, s) => acc + s.totalAmount, 0),
    },
    data: sales,
  });
});

/**
 * Get single sale and its items
 */
exports.getSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findOne({
    _id: req.params.id,
    isDeleted: false,
  })
    .populate('customerAccount', 'name')
    .populate('employeeAccount', 'name')
    .populate('soldBy', 'name email')
    .populate('placedIn', 'name type');
  
  if (!sale) throw new AppError('پلور ونه موندل شو', 404);

  const items = await SaleItem.find({
    sale: sale._id,
    isDeleted: false,
  })
    .populate('product', 'name brand base_unit')
    .populate('unit', 'name conversion_to_base');
  
  // Attach items to sale object for convenience
  const saleObj = sale.toObject();
  saleObj.items = items;
  
  res.status(200).json({
    status: 'success',
    data: saleObj,
  });
});

// @desc Update sale (rollback-safe transaction)
// @route Patch /api/v1/sales/:id
exports.updateSale = asyncHandler(async (req, res, next) => {
  const { error } = updateSaleSchema.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sale = await Sale.findById(req.params.id).session(session);
    if (!sale || sale.isDeleted) throw new AppError('پلور ونه موندل شو', 404);

    const oldItems = await SaleItem.find({ sale: sale._id }).session(session);
    const oldSaleSnapshot = {
      sale: { ...sale.toObject() },
      items: oldItems.map((i) => i.toObject()),
    };

    const {
      saleDate,
      items,
      placedIn,
      invoiceType,
      description,
      discountAmount,
      reason,
    } = req.body;

    // 1️⃣ Validate placedIn account (Dakhal/Tajri/Saraf)
    if (placedIn) {
      const acc = await Account.findById(placedIn).session(session);
      if (!acc) throw new AppError('د پیسو د ځای په ځای کولو لپاره ناسم حساب', 400);
      sale.placedIn = placedIn;
    }

    // 2️⃣ Update basic sale fields
    if (saleDate) {
      const normalized = normalizeSaleDateInput(saleDate);
      if (normalized) sale.saleDate = normalized;
    }
    if (invoiceType) sale.invoiceType = invoiceType;
    // Keep cumulative paidAmount (includes payments recorded via POST /sales/:id/payment)
    if (description !== undefined) sale.description = description;
    // Sale party (customer / employee / walk-in) is fixed after create — stock & ledger depend on it

    if (!items?.length) {
      throw new AppError('لږترلږه یو پلور توکی اړین دی', 400);
    }

    const stockEmployeeId = sale.employee;

    // 3️⃣ Reverse stock from old sale items (per batch, same as create)
    for (const oldItem of oldItems) {
      await restoreSaleItemStock({ session, sale, saleItem: oldItem });
    }

    // 4️⃣ Remove old sale items
    await SaleItem.deleteMany({ sale: sale._id }).session(session);

    // 5️⃣ Recreate sale items with batch-accurate cost & profit
    let itemsSubtotal = 0;
    let totalProfit = 0;

    for (const item of items) {
      const product = await Product.findById(item.product)
        .populate('baseUnit', 'name')
        .session(session);
      if (!product) throw new AppError('ناسم محصول ID', 400);

      const unit = await Unit.findById(item.unit).session(session);
      if (!unit) throw new AppError('ناسم واحد ID', 400);

      const { totalCost, batchesUsed, baseQty } = await deductSaleLineStock({
        session,
        employeeId: stockEmployeeId || null,
        item,
        product,
        unit,
      });

      const saleRevenue = item.unitPrice * item.quantity;
      const profit = saleRevenue - totalCost;

      itemsSubtotal += saleRevenue;
      totalProfit += profit;

      await SaleItem.create(
        [
          buildSaleItemPayload({
            saleId: sale._id,
            product,
            unit,
            item,
            totalCost,
            batchesUsed,
            baseQty,
          }),
        ],
        { session }
      );
    }

    const nextDiscount =
      discountAmount !== undefined ? discountAmount : sale.discountAmount || 0;
    const totals = resolveSaleTotals(
      itemsSubtotal,
      nextDiscount,
      sale.paidAmount
    );
    totalProfit -= totals.discountAmount;

    sale.subtotalAmount = totals.subtotalAmount;
    sale.discountAmount = totals.discountAmount;
    sale.totalAmount = totals.totalAmount;
    sale.dueAmount = totals.dueAmount;

    await sale.save({ session });

    const totalAmount = totals.totalAmount;

    // 6️⃣ Update receivable (Sale txn only — Payment txns stay from payment modal)
    const adjustReceivableSaleTxn = async (accountId) => {
      if (!accountId) return;
      const acc = await Account.findById(accountId).session(session);
      if (!acc) return;

      const saleTxn = await AccountTransaction.findOne({
        referenceType: 'sale',
        referenceId: sale._id,
        account: accountId,
        transactionType: 'Sale',
      }).session(session);

      if (saleTxn) {
        const diff = totalAmount - saleTxn.amount;
        saleTxn.amount = totalAmount;
        await saleTxn.save({ session });
        acc.currentBalance += diff;
        await acc.save({ session });
      }
    };

    if (sale.customer) {
      const customerAcc = sale.customerAccount
        ? await Account.findById(sale.customerAccount).session(session)
        : await getOrCreateAccount({
            refId: sale.customer,
            type: 'customer',
            name: sale.customerName || '',
            session,
          });
      if (!customerAcc) throw new AppError('د پیرودونکي حساب ونه موندل شو', 404);
      await adjustReceivableSaleTxn(customerAcc._id);
    }

    if (sale.employee) {
      const employeeAcc = await Account.findOne({
        refId: sale.employee,
        type: 'employee',
        isDeleted: false,
      }).session(session);
      if (employeeAcc) {
        await adjustReceivableSaleTxn(employeeAcc._id);
      }
    }

    // 7️⃣ Audit log
    const newItems = await SaleItem.find({ sale: sale._id }).session(session);
    const newSaleSnapshot = {
      sale: { ...sale.toObject() },
      items: newItems.map((i) => i.toObject()),
    };

    await AuditLog.create(
      [
        {
          tableName: 'Sale',
          recordId: sale._id,
          operation: 'UPDATE',
          oldData: oldSaleSnapshot,
          newData: newSaleSnapshot,
          reason: reason || 'Sale updated',
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'پلور په بریالیتوب سره تازه شو',
      sale,
      totalProfit,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(err.message || 'د پلور په تازه کولو کې ناکامي', 500);
  }
});

// @desc    Soft delete sale (with rollback to stock & accounts)
// @route   DELETE /api/v1/sales/:id
exports.deleteSale = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sale = await Sale.findById(req.params.id).session(session);
    if (!sale || sale.isDeleted) throw new AppError('پلور ونه موندل شو', 404);

    await assertNoActiveSaleReturns(session, sale._id);

    const saleItems = await SaleItem.find({ sale: sale._id }).session(session);

    // 1️⃣ Restore stock quantities (per batch)
    for (const item of saleItems) {
      await restoreSaleItemStock({ session, sale, saleItem: item });
    }

    // 2️⃣ Reverse all active account transactions (customer, employee, cashier, payments)
    await undoSaleAccountTransactions(session, sale._id);

    // 3️⃣ Mark sale + items as deleted
    markSoftDeleted(sale, req.user?._id);
    await sale.save({ session });

    await SaleItem.updateMany(
      { sale: sale._id },
      { $set: { isDeleted: true } },
      { session }
    );

    // 4️⃣ Audit log
    await AuditLog.create(
      [
        {
          tableName: 'Sale',
          recordId: sale._id,
          operation: 'DELETE',
          oldData: {
            sale: sale.toObject(),
            items: saleItems.map((i) => i.toObject()),
          },
          reason: req.body.reason || 'Sale soft deleted',
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message:
        'پلور په بریالیتوب سره حذف شو',
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(err.message || 'د پلور په حذف کولو کې ناکامي', 500);
  }
});

// @desc    Restore soft-deleted sale
// @route   PATCH /api/v1/sales/:id/restore
exports.restoreSale = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sale = await Sale.findById(req.params.id).session(session);
    if (!sale || !sale.isDeleted)
      throw new AppError('پلور ونه موندل شو یا حذف شوی نه دی', 404);

    const saleItems = await SaleItem.find({ sale: sale._id }).session(session);

    // 1️⃣ Deduct stock again
    for (const item of saleItems) {
      const unit = await Unit.findById(item.unit).session(session);
      const product = await Product.findById(item.product).session(session);
      if (!unit || !product) {
        throw new AppError('د پلور توکي محصول یا واحد ونه موندل شو', 400);
      }
      await deductSaleLineStock({
        session,
        employeeId: sale.employee,
        item,
        product,
        unit,
      });
    }

    // 2️⃣ Re-activate original account transactions (exact inverse of soft-delete)
    await redoSaleAccountTransactions(session, sale._id, sale);

    // 3️⃣ Mark sale and items active again
    markRestored(sale);
    await sale.save({ session });

    await SaleItem.updateMany(
      { sale: sale._id },
      { $set: { isDeleted: false } },
      { session }
    );

    // 4️⃣ Audit log
    await AuditLog.create(
      [
        {
          tableName: 'Sale',
          recordId: sale._id,
          operation: 'RESTORE',
          newData: {
            sale: sale.toObject(),
            items: saleItems.map((i) => i.toObject()),
          },
          reason: req.body.reason || 'Sale restored',
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'پلور په بریالیتوب سره بیرته راستون شو',
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(err.message || 'د پلور په بیرته راستنیدو کې ناکامي', 500);
  }
});

// @desc    Return a sold item (with stock & account adjustments)
// @route   POST /api/v1/sales/returns
exports.returnSaleItem = asyncHandler(async (req, res, next) => {
  const { error, value } = createSaleReturnSchema.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400);

  const {
    saleId,
    productId,
    unitId,
    quantity,
    refundAmount,
    cashRefundAmount = 0,
    reason,
    batchNumber,
  } = value;

  if (cashRefundAmount > refundAmount) {
    throw new AppError(
      'نغدي بیرته ورکول باید له ټولیز بیرته ورکولو مبلغ څخه زیات نه وي',
      400
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sale = await Sale.findById(saleId).session(session);
    if (!sale || sale.isDeleted) throw new AppError('پلور ونه موندل شو', 404);

    if (!sale.subtotalAmount) {
      const itemsForSubtotal = await SaleItem.find({
        sale: saleId,
        isDeleted: { $ne: true },
      }).session(session);
      sale.subtotalAmount = sumActiveItemsSubtotal(itemsForSubtotal);
    }
    if (
      (sale.discountAmount == null || sale.discountAmount === undefined) &&
      sale.subtotalAmount > (sale.totalAmount || 0)
    ) {
      sale.discountAmount = sale.subtotalAmount - sale.totalAmount;
    }

    if (cashRefundAmount > sale.paidAmount) {
      throw new AppError('نغدي بیرته ورکول له تادیه شوي مقدار څخه زیات دی', 400);
    }

    const requiredCashRefund = computeRequiredCashRefund(sale, refundAmount);
    if (requiredCashRefund > 0 && cashRefundAmount + 0.01 < requiredCashRefund) {
      throw new AppError(
        `د نغدو بیرته ورکولو مبلغ اړین دی: ${requiredCashRefund} افغانۍ (د تادیه شوي برخې سره برابر)`,
        400
      );
    }

    const unit = await Unit.findById(unitId).session(session);
    if (!unit) throw new AppError('ناسم واحد ID', 400);

    const item = await SaleItem.findOne({
      sale: saleId,
      product: productId,
      isDeleted: { $ne: true },
    }).session(session);
    if (!item) throw new AppError('د پلور توکی ونه موندل شو', 404);

    const lineRefundPreDiscount = computeLineRefundPreDiscount(item, quantity);
    const effectiveRefund = computeEffectiveCustomerRefund(
      sale,
      lineRefundPreDiscount
    );

    assertRefundAmountAllowed(sale, item, quantity, refundAmount);
    const baseQty = await assertReturnQuantityAllowed({
      session,
      saleItem: item,
      returnUnit: unit,
      quantity,
    });
    const primaryUnit = await loadPrimaryUnitForProduct(productId, session);
    const stockQty = toStockQuantity(quantity, unit, primaryUnit);

    const oldItemSnapshot = { ...item.toObject() };
    const oldSaleSnapshot = { ...sale.toObject() };

    applySaleItemReturnDeduction({
      saleItem: item,
      quantity,
      refundAmount: lineRefundPreDiscount,
      baseQty,
    });
    await item.save({ session });

    let recordedBatch = batchNumber || 'DEFAULT';
    let restoredBatches = [];

    if (sale.employee) {
      recordedBatch = resolveEmployeeReturnBatch(item);
      const product = await Product.findById(productId).session(session);
      if (!product) throw new AppError('محصول ونه موندل شو', 404);

      await incrementEmployeeStock({
        session,
        employee: sale.employee,
        productId,
        batchNumber: recordedBatch,
        stockQty,
        costPerUnit: item.costPricePerUnit || product.latestPurchasePrice || 0,
      });
      restoredBatches = [{ batchNumber: recordedBatch, quantityUsed: stockQty }];
    } else {
      restoredBatches = await applyStoreReturnStock({
        session,
        productId,
        saleItem: item,
        stockQty,
        batchNumberFromRequest: batchNumber,
      });
      recordedBatch =
        restoredBatches.length === 1
          ? restoredBatches[0].batchNumber
          : 'MULTI';
    }

    const saleReturn = await SaleReturn.create(
      [
        {
          sale: saleId,
          product: productId,
          unit: unitId,
          batchNumber: recordedBatch,
          quantity,
          refundAmount: effectiveRefund,
          lineRefundAmount: lineRefundPreDiscount,
          cashRefundAmount,
          stockRestoredBatches: mapRestoredBatchesForStorage(restoredBatches),
          reason,
          handledBy: req.user._id,
        },
      ],
      { session }
    );

    const saleDueSnapshot = {
      totalAmount: sale.totalAmount,
      paidAmount: sale.paidAmount,
    };

    const activeItems = await getActiveSaleItems(session, saleId);
    const { receivableAdjustment } = applySaleTotalsAfterReturn(sale, activeItems);
    const receivableReduced = resolveReceivableReturnCredit(
      saleDueSnapshot,
      receivableAdjustment
    );

    const accountResult = await applySaleReturnAccounts({
      session,
      sale,
      refundAmount: receivableReduced,
      cashRefundAmount,
      saleReturnId: saleReturn[0]._id,
      userId: req.user._id,
      reverse: false,
    });

    saleReturn[0].receivableReduced = receivableReduced;
    saleReturn[0].cashRefundAccount = accountResult.cashRefundAccountId;
    await saleReturn[0].save({ session });

    await sale.save({ session });

    const newItemSnapshot = { ...item.toObject() };
    const newSaleSnapshot = { ...sale.toObject() };

    await AuditLog.create(
      [
        {
          tableName: 'SaleReturn',
          recordId: saleReturn[0]._id,
          operation: 'INSERT',
          oldData: {
            sale: oldSaleSnapshot,
            item: oldItemSnapshot,
          },
          newData: {
            sale: newSaleSnapshot,
            item: newItemSnapshot,
            returnedItem: saleReturn[0],
          },
          reason: reason || 'Product returned by customer',
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'محصول په بریالیتوب سره بیرته راستون شو',
      saleReturn: saleReturn[0],
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    if (err.name === 'ValidationError') {
      throw new AppError(
        'د پلور مجموعي اندازه ناسمه ده. مهرباني وکړئ د تخفیف وروسته بیرته ورکولو مبلغ وکاروئ.',
        400
      );
    }
    throw new AppError(err.message || 'د پلور بیرته راستنیدو په پروسس کولو کې ناکامي', 500);
  }
});

// @desc    Get all sale returns (paginated)
// @route   GET /api/v1/sale-returns
exports.getAllSaleReturns = asyncHandler(async (req, res, next) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const query = { isDeleted: false };
  if (req.query.saleId) {
    if (!mongoose.Types.ObjectId.isValid(req.query.saleId)) {
      throw new AppError('ناسم د پلور ID', 400);
    }
    query.sale = req.query.saleId;
  }

  const [returns, total] = await Promise.all([
    SaleReturn.find(query)
      .populate('sale', 'saleDate totalAmount paidAmount dueAmount')
      .populate('product', 'name')
      .populate('unit', 'name')
      .populate('handledBy', 'name email')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    SaleReturn.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    results: returns.length,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalRecords: total,
    },
    data: returns,
  });
});

// @desc    Get single sale return details
// @route   GET /api/v1/sale-returns/:id
exports.getSaleReturn = asyncHandler(async (req, res, next) => {
  const saleReturn = await SaleReturn.findOne({
    _id: req.params.id,
    isDeleted: false,
  })
    .populate('sale', 'saleDate totalAmount paidAmount dueAmount')
    .populate('product', 'name')
    .populate('unit', 'name conversion_to_base')
    .populate('handledBy', 'name email');

  if (!saleReturn) throw new AppError('د پلور بیرته راستنیدنه ونه موندل شوه', 404);

  res.status(200).json({
    success: true,
    data: saleReturn,
  });
});

// @desc    Update a sale return (rollback-safe)
// @route   PATCH /api/v1/sales/returns/:id
exports.updateSaleReturn = asyncHandler(async (req, res, next) => {
  const { error, value } = updateSaleReturnSchema.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const returnId = req.params.id;
    const { quantity, refundAmount, reason, batchNumber, unitId, cashRefundAmount } =
      value;

    const saleReturn = await SaleReturn.findById(returnId).session(session);
    if (!saleReturn || saleReturn.isDeleted)
      throw new AppError('د پلور بیرته راستنیدنه ونه موندل شوه', 404);

    const sale = await Sale.findById(saleReturn.sale).session(session);
    if (!sale || sale.isDeleted)
      throw new AppError('اصلي پلور ونه موندل شو', 404);

    const oldReturnSnapshot = { ...saleReturn.toObject() };
    const oldCashRefund = saleReturn.cashRefundAmount || 0;

    const saleItem = await SaleItem.findOne({
      sale: saleReturn.sale,
      product: saleReturn.product,
    }).session(session);
    if (!saleItem) throw new AppError('د پلور توکی ونه موندل شو', 404);

    const prevUnit = await Unit.findById(saleReturn.unit).session(session);
    if (!prevUnit) throw new AppError('د بیرته راستنیدنې واحد ونه موندل شو', 400);
    const prevBaseQty = toBaseQty(saleReturn.quantity, prevUnit);
    const prevPrimaryUnit = await loadPrimaryUnitForProduct(
      saleReturn.product,
      session
    );
    const prevStockQty = toStockQuantity(
      saleReturn.quantity,
      prevUnit,
      prevPrimaryUnit
    );
    const prevLineRefund = resolveReturnLineRefund(saleReturn, saleItem);

    revertSaleItemReturnDeduction({
      saleItem,
      quantity: saleReturn.quantity,
      refundAmount: prevLineRefund,
      baseQty: prevBaseQty,
    });
    await saleItem.save({ session });

    if (sale.employee) {
      await reverseEmployeeReturnStock({
        session,
        employee: sale.employee,
        productId: saleReturn.product,
        saleItem,
        saleReturn,
        stockQty: prevStockQty,
      });
    } else {
      await reverseStoreReturnStock({
        session,
        productId: saleReturn.product,
        saleItem,
        saleReturn,
        stockQty: prevStockQty,
      });
    }

    await applySaleReturnAccounts({
      session,
      sale,
      refundAmount: getPostedReceivableCredit(saleReturn),
      cashRefundAmount: oldCashRefund,
      cashRefundAccountId: saleReturn.cashRefundAccount,
      saleReturnId: saleReturn._id,
      userId: req.user._id,
      reverse: true,
    });

    let activeItems = await getActiveSaleItems(session, saleReturn.sale);
    applySaleTotalsAfterReturn(sale, activeItems);
    await sale.save({ session });

    const newQuantity = quantity ?? saleReturn.quantity;
    const newRefund = refundAmount ?? saleReturn.refundAmount;
    const newCashRefund =
      cashRefundAmount !== undefined ? cashRefundAmount : oldCashRefund;
    const newBatch = batchNumber ?? saleReturn.batchNumber;
    const newUnitId = unitId ?? saleReturn.unit;

    if (newCashRefund > newRefund) {
      throw new AppError(
        'نغدي بیرته ورکول باید له ټولیز بیرته ورکولو مبلغ څخه زیات نه وي',
        400
      );
    }
    if (newCashRefund > sale.paidAmount) {
      throw new AppError('نغدي بیرته ورکول له تادیه شوي مقدار څخه زیات دی', 400);
    }

    const requiredCashRefund = computeRequiredCashRefund(sale, newRefund);
    if (requiredCashRefund > 0 && newCashRefund + 0.01 < requiredCashRefund) {
      throw new AppError(
        `د نغدو بیرته ورکولو مبلغ اړین دی: ${requiredCashRefund} افغانۍ (د تادیه شوي برخې سره برابر)`,
        400
      );
    }

    const unitDoc = await Unit.findById(newUnitId).session(session);
    if (!unitDoc) throw new AppError('ناسم واحد ID', 400);

    const newLineRefund = computeLineRefundPreDiscount(saleItem, newQuantity);
    const newEffectiveRefund = computeEffectiveCustomerRefund(
      sale,
      newLineRefund
    );

    assertRefundAmountAllowed(sale, saleItem, newQuantity, newRefund);
    const newBaseQty = await assertReturnQuantityAllowed({
      session,
      saleItem,
      returnUnit: unitDoc,
      quantity: newQuantity,
    });
    const newPrimaryUnit = await loadPrimaryUnitForProduct(
      saleReturn.product,
      session
    );
    const newStockQty = toStockQuantity(
      newQuantity,
      unitDoc,
      newPrimaryUnit
    );

    applySaleItemReturnDeduction({
      saleItem,
      quantity: newQuantity,
      refundAmount: newLineRefund,
      baseQty: newBaseQty,
    });
    await saleItem.save({ session });

    let recordedBatch = newBatch || 'DEFAULT';
    let restoredBatches = [];
    if (sale.employee) {
      recordedBatch = resolveEmployeeReturnBatch(saleItem);
      const product = await Product.findById(saleReturn.product).session(session);
      if (!product) throw new AppError('محصول ونه موندل شو', 404);

      await incrementEmployeeStock({
        session,
        employee: sale.employee,
        productId: saleReturn.product,
        batchNumber: recordedBatch,
        stockQty: newStockQty,
        costPerUnit: saleItem.costPricePerUnit || product.latestPurchasePrice || 0,
      });
      restoredBatches = [{ batchNumber: recordedBatch, quantityUsed: newStockQty }];
    } else {
      restoredBatches = await applyStoreReturnStock({
        session,
        productId: saleReturn.product,
        saleItem,
        stockQty: newStockQty,
        batchNumberFromRequest: newBatch,
      });
      recordedBatch =
        restoredBatches.length === 1
          ? restoredBatches[0].batchNumber
          : 'MULTI';
    }

    Object.assign(saleReturn, {
      quantity: newQuantity,
      refundAmount: newEffectiveRefund,
      lineRefundAmount: newLineRefund,
      cashRefundAmount: newCashRefund,
      reason: reason ?? saleReturn.reason,
      batchNumber: recordedBatch,
      stockRestoredBatches: mapRestoredBatchesForStorage(restoredBatches),
      unit: newUnitId,
    });
    await saleReturn.save({ session });

    activeItems = await getActiveSaleItems(session, saleReturn.sale);
    const saleDueSnapshot = {
      totalAmount: sale.totalAmount,
      paidAmount: sale.paidAmount,
    };
    const { receivableAdjustment } = applySaleTotalsAfterReturn(sale, activeItems);
    const receivableReduced = resolveReceivableReturnCredit(
      saleDueSnapshot,
      receivableAdjustment
    );

    const accountResult = await applySaleReturnAccounts({
      session,
      sale,
      refundAmount: receivableReduced,
      cashRefundAmount: newCashRefund,
      saleReturnId: saleReturn._id,
      userId: req.user._id,
      reverse: false,
    });

    saleReturn.receivableReduced = receivableReduced;
    saleReturn.cashRefundAccount = accountResult.cashRefundAccountId;
    await saleReturn.save({ session });

    await sale.save({ session });

    await AuditLog.create(
      [
        {
          tableName: 'SaleReturn',
          recordId: saleReturn._id,
          operation: 'UPDATE',
          oldData: oldReturnSnapshot,
          newData: saleReturn.toObject(),
          reason: reason || 'Sale return updated',
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'د پلور بیرته راستنیدنه په بریالیتوب سره تازه شوه',
      saleReturn,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(err.message || 'د پلور بیرته راستنیدنې په تازه کولو کې ناکامي', 500);
  }
});

// @desc    Soft delete a sale return (rollback-safe)
// @route   DELETE /api/v1/sales/returns/:id
exports.deleteSaleReturn = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const saleReturn = await SaleReturn.findById(req.params.id).session(session);
    if (!saleReturn || saleReturn.isDeleted) {
      throw new AppError('د پلور بیرته راستنیدنه ونه موندل شوه', 404);
    }

    const sale = await Sale.findById(saleReturn.sale).session(session);
    if (!sale || sale.isDeleted) {
      throw new AppError('اصلي پلور ونه موندل شو', 404);
    }

    const oldReturnSnapshot = { ...saleReturn.toObject() };

    const unit = await Unit.findById(saleReturn.unit).session(session);
    if (!unit) throw new AppError('د بیرته راستنیدنې واحد ونه موندل شو', 400);
    const baseQty = toBaseQty(saleReturn.quantity, unit);
    const primaryUnit = await loadPrimaryUnitForProduct(
      saleReturn.product,
      session
    );
    const stockQty = toStockQuantity(saleReturn.quantity, unit, primaryUnit);

    const saleItem = await SaleItem.findOne({
      sale: saleReturn.sale,
      product: saleReturn.product,
    }).session(session);

    if (sale.employee) {
      await reverseEmployeeReturnStock({
        session,
        employee: sale.employee,
        productId: saleReturn.product,
        saleItem,
        saleReturn,
        stockQty,
      });
    } else {
      await reverseStoreReturnStock({
        session,
        productId: saleReturn.product,
        saleItem,
        saleReturn,
        stockQty,
      });
    }

    await applySaleReturnAccounts({
      session,
      sale,
      refundAmount: getPostedReceivableCredit(saleReturn),
      cashRefundAmount: saleReturn.cashRefundAmount || 0,
      cashRefundAccountId: saleReturn.cashRefundAccount,
      saleReturnId: saleReturn._id,
      userId: req.user._id,
      reverse: true,
    });

    if (saleItem) {
      const lineRefund = resolveReturnLineRefund(saleReturn, saleItem);
      revertSaleItemReturnDeduction({
        saleItem,
        quantity: saleReturn.quantity,
        refundAmount: lineRefund,
        baseQty,
      });
      await saleItem.save({ session });

      const activeItems = await getActiveSaleItems(session, saleReturn.sale);
      applySaleTotalsAfterReturn(sale, activeItems);
    }
    await sale.save({ session });

    saleReturn.isDeleted = true;
    await saleReturn.save({ session });

    await AuditLog.create(
      [
        {
          tableName: 'SaleReturn',
          recordId: saleReturn._id,
          operation: 'DELETE',
          oldData: oldReturnSnapshot,
          reason: req.body.reason || 'Sale return soft deleted',
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'د پلور بیرته راستنیدنه په بریالیتوب سره لغوه شوه',
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(
      err.message || 'د پلور بیرته راستنیدنې په لغوه کولو کې ناکامي',
      err.statusCode || 500
    );
  }
});

// @desc Restore soft-deleted sale return (rollback-safe)
// @route   PATCH /api/v1/sales/returns/:id/restore
exports.restoreSaleReturn = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const saleReturn = await SaleReturn.findById(req.params.id).session(
      session
    );
    if (!saleReturn || !saleReturn.isDeleted)
      throw new AppError('د پلور بیرته راستنیدنه ونه موندل شوه یا حذف شوې نه ده', 404);

    const sale = await Sale.findById(saleReturn.sale).session(session);
    if (!sale || sale.isDeleted)
      throw new AppError('اصلي پلور ونه موندل شو', 404);

    const cashRefund = saleReturn.cashRefundAmount || 0;
    if (cashRefund > sale.paidAmount) {
      throw new AppError('نغدي بیرته ورکول له تادیه شوي مقدار څخه زیات دی', 400);
    }

    const unit = await Unit.findById(saleReturn.unit).session(session);
    if (!unit) throw new AppError('د بیرته راستنیدنې واحد ونه موندل شو', 400);

    const saleItem = await SaleItem.findOne({
      sale: saleReturn.sale,
      product: saleReturn.product,
    }).session(session);
    if (!saleItem) throw new AppError('د پلور توکی ونه موندل شو', 404);

    const baseQty = toBaseQty(saleReturn.quantity, unit);
    const primaryUnit = await loadPrimaryUnitForProduct(
      saleReturn.product,
      session
    );
    const stockQty = toStockQuantity(saleReturn.quantity, unit, primaryUnit);
    const lineRefund = resolveReturnLineRefund(saleReturn, saleItem);

    assertRefundAmountAllowed(
      sale,
      {
        ...saleItem.toObject(),
        totalPrice: saleItem.totalPrice + lineRefund,
      },
      saleReturn.quantity,
      saleReturn.refundAmount
    );
    await assertReturnQuantityAllowed({
      session,
      saleItem,
      returnUnit: unit,
      quantity: saleReturn.quantity,
      extraBaseAllowance: baseQty,
    });

    applySaleItemReturnDeduction({
      saleItem,
      quantity: saleReturn.quantity,
      refundAmount: lineRefund,
      baseQty,
    });
    await saleItem.save({ session });

    let restoredBatches = [];
    let recordedBatch = saleReturn.batchNumber || 'DEFAULT';
    if (sale.employee) {
      recordedBatch = resolveEmployeeReturnBatch(saleItem);
      const product = await Product.findById(saleReturn.product).session(session);
      if (!product) throw new AppError('محصول ونه موندل شو', 404);

      await incrementEmployeeStock({
        session,
        employee: sale.employee,
        productId: saleReturn.product,
        batchNumber: recordedBatch,
        stockQty,
        costPerUnit: saleItem.costPricePerUnit || product.latestPurchasePrice || 0,
      });
      restoredBatches = [{ batchNumber: recordedBatch, quantityUsed: stockQty }];
    } else {
      restoredBatches = await applyStoreReturnStock({
        session,
        productId: saleReturn.product,
        saleItem,
        stockQty,
        batchNumberFromRequest:
          saleReturn.batchNumber && saleReturn.batchNumber !== 'MULTI'
            ? saleReturn.batchNumber
            : undefined,
      });
      recordedBatch =
        restoredBatches.length === 1
          ? restoredBatches[0].batchNumber
          : 'MULTI';
    }

    saleReturn.batchNumber = recordedBatch;
    saleReturn.stockRestoredBatches = mapRestoredBatchesForStorage(restoredBatches);

    const saleDueSnapshot = {
      totalAmount: sale.totalAmount,
      paidAmount: sale.paidAmount,
    };

    const activeItems = await getActiveSaleItems(session, saleReturn.sale);
    const { receivableAdjustment } = applySaleTotalsAfterReturn(sale, activeItems);
    const receivableReduced = resolveReceivableReturnCredit(
      saleDueSnapshot,
      receivableAdjustment
    );

    const accountResult = await applySaleReturnAccounts({
      session,
      sale,
      refundAmount: receivableReduced,
      cashRefundAmount: cashRefund,
      saleReturnId: saleReturn._id,
      userId: req.user._id,
      reverse: false,
    });

    saleReturn.receivableReduced = receivableReduced;
    saleReturn.cashRefundAccount = accountResult.cashRefundAccountId;
    await saleReturn.save({ session });

    await sale.save({ session });

    saleReturn.isDeleted = false;
    await saleReturn.save({ session });

    await AuditLog.create(
      [
        {
          tableName: 'SaleReturn',
          recordId: saleReturn._id,
          operation: 'RESTORE',
          oldData: null,
          newData: saleReturn.toObject(),
          reason: req.body.reason || 'Sale return restored',
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'د پلور بیرته راستنیدنه په بریالیتوب سره بیرته راستونه شوه',
      saleReturn,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(err.message || 'د پلور بیرته راستنیدنې په بیرته راستنیدو کې ناکامي', 500);
  }
});

// @desc Record additional payment against a sale
// @route POST /api/v1/sales/:id/payment
exports.recordSalePayment = asyncHandler(async (req, res, next) => {
  const { amount, paymentAccount, description } = req.body;
  const saleId = req.params.id;

  // Validate saleId
  if (!saleId || saleId === 'null' || saleId === 'undefined') {
    throw new AppError('سم د پلور ID اړین دی', 400);
  }

  if (!amount || amount <= 0) {
    throw new AppError('د تادیې مقدار باید له 0 څخه زیات وي', 400);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1️⃣ Find the sale
    const sale = await Sale.findById(saleId).session(session);
    if (!sale || sale.isDeleted) {
      throw new AppError('پلور ونه موندل شو', 404);
    }

    // 2️⃣ Calculate remaining due
    const remainingDue = sale.totalAmount - sale.paidAmount;
    
    if (amount > remainingDue) {
      throw new AppError(
        `د تادیې مقدار (${amount}) له پاتې پور (${remainingDue}) څخه زیات دی`,
        400
      );
    }

    // 3️⃣ Find customer account (if sale has customer) - prefer explicit `customerAccount` on sale
    let customerAccount = null;
    if (sale.customer) {
      customerAccount = sale.customerAccount
        ? await Account.findById(sale.customerAccount).session(session)
        : await Account.findOne({ refId: sale.customer, type: 'customer', isDeleted: false }).session(session);

      if (!customerAccount) {
        throw new AppError('د پیرودونکي حساب ونه موندل شو', 404);
      }
    }

    // 4️⃣ Validate payment account
    const payAccount = await Account.findById(paymentAccount).session(session);
    if (!payAccount || payAccount.isDeleted) {
      throw new AppError('د تادیې حساب ونه موندل شو', 404);
    }

    // 5️⃣ Create payment transactions
    // Increase cashier balance (you receive money)
    await AccountTransaction.create(
      [
        {
          account: payAccount._id,
          transactionType: 'Payment',
          amount: amount,
          referenceType: 'sale',
          referenceId: sale._id,
          created_by: req.user._id,
          description: description || `پرداخت اضافی برای فروش - بل نمبر: ${sale.billNumber || 'N/A'}`,
        },
      ],
      { session }
    );

    payAccount.currentBalance += amount;
    await payAccount.save({ session });

    // Reduce customer balance (their debt decreases)
    if (customerAccount) {
      await AccountTransaction.create(
        [
          {
            account: customerAccount._id,
            transactionType: 'Payment',
            amount: -amount,
            referenceType: 'sale',
            referenceId: sale._id,
            created_by: req.user._id,
            description: description || `پرداخت اضافی برای فروش - بل نمبر: ${sale.billNumber || 'N/A'}`,
          },
        ],
        { session }
      );

      customerAccount.currentBalance -= amount;
      await customerAccount.save({ session });
    }

    // 6️⃣ Update sale paid amount
    sale.paidAmount += amount;
    sale.dueAmount = Math.max(0, sale.totalAmount - sale.paidAmount);
    if (!sale.placedIn) {
      sale.placedIn = paymentAccount;
    }
    await sale.save({ session });

    // 7️⃣ Audit Log
    await AuditLog.create(
      [
        {
          tableName: 'Sale',
          recordId: sale._id,
          operation: 'UPDATE',
          oldData: { paidAmount: sale.paidAmount - amount },
          newData: { paidAmount: sale.paidAmount },
          reason: description || `Additional payment recorded`,
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'تادیه په بریالیتوب سره ثبت شوه',
      sale: {
        _id: sale._id,
        totalAmount: sale.totalAmount,
        paidAmount: sale.paidAmount,
        dueAmount: sale.dueAmount,
      },
      paymentAmount: amount,
      apiResponse: {
        customerBalance: customerAccount?.currentBalance,
        cashierBalance: payAccount.currentBalance,
      },
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(err.message || 'د تادیې په ثبتولو کې ناکامي', 500);
  }
});

/**
 * @desc    Get sales summary by date range (daily/weekly/monthly)
 * @route   GET /api/v1/sales/reports
 */
exports.getSalesReports = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, groupBy = 'day', includeProfit = 'false' } = req.query;

  if (!startDate || !endDate) {
    throw new AppError('د پیل او پای نیټه اړینه ده', 400);
  }

  const saleDateRange = buildSaleDateFilter(startDate, endDate);
  if (!saleDateRange) {
    throw new AppError('د پیل او پای نیټه اړینه ده', 400);
  }

  const matchStage = {
    isDeleted: false,
    saleDate: saleDateRange,
  };

  let saleGroupStage;
  let saleItemGroupStage;

  switch (groupBy) {
    case 'day':
      saleGroupStage = {
        _id: {
          year: { $year: '$saleDate' },
          month: { $month: '$saleDate' },
          day: { $dayOfMonth: '$saleDate' },
        },
      };
      saleItemGroupStage = {
        _id: {
          year: { $year: '$sale.saleDate' },
          month: { $month: '$sale.saleDate' },
          day: { $dayOfMonth: '$sale.saleDate' },
        },
      };
      break;
    case 'week':
      saleGroupStage = {
        _id: {
          year: { $year: '$saleDate' },
          week: { $week: '$saleDate' },
        },
      };
      saleItemGroupStage = {
        _id: {
          year: { $year: '$sale.saleDate' },
          week: { $week: '$sale.saleDate' },
        },
      };
      break;
    case 'month':
      saleGroupStage = {
        _id: {
          year: { $year: '$saleDate' },
          month: { $month: '$saleDate' },
        },
      };
      saleItemGroupStage = {
        _id: {
          year: { $year: '$sale.saleDate' },
          month: { $month: '$sale.saleDate' },
        },
      };
      break;
    default:
      throw new AppError(
        'ناسم groupBy پیرامیټر. باید ورځ، اونۍ، یا میاشت وي',
        400
      );
  }

  // Get sales summary (lightweight)
  const salesSummary = await Sale.aggregate([
    { $match: matchStage },
    {
      $group: {
        ...saleGroupStage,
        totalSales: { $sum: '$totalAmount' },
        totalPaid: { $sum: '$paidAmount' },
        totalDue: { $sum: '$dueAmount' },
        salesCount: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
  ]);
  let combinedSummary = salesSummary;

  const saleItemProfitMatch = {
    isDeleted: false,
    'sale.isDeleted': false,
    'sale.saleDate': saleDateRange,
  };

  // Optionally include profit (heavier join) only when requested
  if (includeProfit === 'true') {
    const profitSummary = await SaleItem.aggregate([
      {
        $lookup: {
          from: 'sales',
          localField: 'sale',
          foreignField: '_id',
          as: 'sale',
        },
      },
      { $unwind: '$sale' },
      { $match: saleItemProfitMatch },
      {
        $group: {
          ...saleItemGroupStage,
          totalProfit: { $sum: '$profit' },
          totalCost: { $sum: saleItemCostExpr },
          totalRevenue: { $sum: '$totalPrice' },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
    ]);

    combinedSummary = salesSummary.map(saleItem => {
      const profitItem = profitSummary.find(
        p => JSON.stringify(p._id) === JSON.stringify(saleItem._id)
      );
      return {
        ...saleItem,
        totalProfit: profitItem?.totalProfit || 0,
        totalCost: profitItem?.totalCost || 0,
        totalRevenue: profitItem?.totalRevenue || 0,
      };
    });
  }

  // Format dates for frontend
  const formattedSummary = combinedSummary.map(item => {
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
    
    const base = {
      date: dateLabel,
      sales: item.totalSales,
      paid: item.totalPaid,
      due: item.totalDue,
      count: item.salesCount,
    };
    if (includeProfit === 'true') {
      return {
        ...base,
        purchases: item.totalCost || 0,
        profit: item.totalProfit || 0,
      };
    }
    return base;
  });

  res.status(200).json({
    success: true,
    data: {
      period: { startDate, endDate },
      groupBy,
      summary: formattedSummary,
      totals: {
        totalSales: formattedSummary.reduce((sum, item) => sum + item.sales, 0),
        totalProfit: includeProfit === 'true' ? formattedSummary.reduce((sum, item) => sum + (item.profit || 0), 0) : undefined,
        totalPaid: formattedSummary.reduce((sum, item) => sum + item.paid, 0),
        totalDue: formattedSummary.reduce((sum, item) => sum + item.due, 0),
        totalCount: formattedSummary.reduce((sum, item) => sum + item.count, 0),
      },
    },
  });
});

// @desc    Permanently delete a soft-deleted sale
// @route   DELETE /api/v1/sales/:id/permanent
exports.permanentDeleteSale = asyncHandler(async (req, res, next) => {
  validateObjectId(req.params.id, 'ناسم پلور ID');

  const sale = await Sale.findById(req.params.id);
  if (!sale) throw new AppError('پلور ونه موندل شو', 404);
  if (!sale.isDeleted) {
    throw new AppError('لومړی باید پلور په کثافاتو کې حذف شوی وي', 400);
  }

  await assertNoActiveSaleReturns(null, sale._id);

  await SaleItem.deleteMany({ sale: sale._id });
  await SaleReturn.deleteMany({ sale: sale._id });
  await AccountTransaction.deleteMany({
    referenceType: 'sale',
    referenceId: sale._id,
  });
  await Sale.deleteOne({ _id: sale._id });

  res.status(200).json({
    success: true,
    message: 'پلور په تل لپاره حذف شو',
  });
});
