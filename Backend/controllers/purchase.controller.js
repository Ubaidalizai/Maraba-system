const Purchase = require('../models/purchase.model');
const Supplier = require('../models/supplier.model');
const AppError = require('../utils/AppError');
const asyncHandler = require('../middlewares/asyncHandler');
const {
  createPurchaseSchema,
  updatePurchaseSchema,
} = require('../validations/purchase.validation');

const mongoose = require('mongoose');
const PurchaseItem = require('../models/purchaseItem.model');
const Product = require('../models/product.model');
const Unit = require('../models/unit.model');
const AuditLog = require('../models/auditLog.model');
const Stock = require('../models/stock.model');
const Account = require('../models/account.model');
const AccountTransaction = require('../models/accountTransaction.model');
const { getOrCreateAccount } = require('../utils/accountHelper');
const {
  parseDeletionFilter,
  markSoftDeleted,
  markRestored,
  validateObjectId,
} = require('../utils/softDeleteHelpers');
const {
  undoPurchaseAccountTransactions,
  redoPurchaseAccountTransactions,
} = require('../utils/purchaseTrashAccounts');
const {
  undoPurchaseStockForDelete,
  redoPurchaseStockForRestore,
} = require('../utils/purchaseTrashStock');
const { assertNoActivePurchaseReturns } = require('../utils/purchaseReturnHelpers');
const {
  getPurchaseLineConstraints,
  validatePurchaseEditStock,
} = require('../utils/purchaseEditStock');
const { assertPurchaseItemUsesPrimaryUnit } = require('../utils/purchaseUnitHelpers');
const {
  toStockQuantity,
  purchasePriceForStock,
  loadPrimaryUnitForProduct,
} = require('../utils/primaryUnitStock');

// Helper function to validate account balance
const validateAccountBalance = async (accountId, requiredAmount, session) => {
  const account = await Account.findById(accountId).session(session);
  if (!account) throw new AppError('حساب ونه موندل شو', 404);
  
  if (requiredAmount > 0) {
    // Only validate cashier and safe accounts - they cannot go negative
    if (account.type === 'cashier' || account.type === 'safe') {
      if (account.currentBalance < requiredAmount) {
        throw new AppError(
          `موجودی ناکافی! په ${account.name} حساب کې موجودی: ${account.currentBalance.toLocaleString()} افغانۍ، اړین مبلغ: ${requiredAmount.toLocaleString()} افغانۍ`,
          400
        );
      }
    }
    // Saraf account can go negative (credit account), so no validation needed
  }
  
  return account;
};

// @desc Create a complete purchase (with items, stock & accounts)
// @route POST /api/v1/purchases
exports.createPurchase = asyncHandler(async (req, res, next) => {
  const { error } = createPurchaseSchema.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400);

  const { supplier, purchaseDate, items, paidAmount, paymentAccount, stockLocation = 'warehouse', description } =
    req.body;

  // 1️⃣ Start transaction session
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 2️⃣ Resolve supplier and supplier account
    let supplierDoc = null;
    let supplierRefId = supplier; // may be undefined if caller provided supplierAccount only

    // If frontend provided an explicit supplierAccount id, prefer it
    let supplierAccount = null;
    if (req.body.supplierAccount) {
      supplierAccount = await Account.findById(req.body.supplierAccount).session(session);
      if (!supplierAccount) throw new AppError('ناسم تاجر حساب ID', 400);

      // If the account has a refId pointing to a Supplier, use it
      if (supplierAccount.refId) {
        supplierRefId = supplierAccount.refId;
      }
    }

    // If we have a supplier reference id, try to fetch the Supplier doc
    if (supplierRefId) {
      supplierDoc = await Supplier.findById(supplierRefId).session(session);
      if (!supplierDoc && supplier) throw new AppError('ناسم تاجر ID', 400);
    }

    // Ensure we have a supplier account object (create or use existing)
    if (!supplierAccount) {
      // Use supplierDoc.name when available, otherwise fall back to undefined
      const nameForAccount = supplierDoc ? supplierDoc.name : undefined;
      supplierAccount = await getOrCreateAccount({
        refId: supplierRefId,
        type: 'supplier',
        name: nameForAccount,
        session,
      });
    }

    // 3️⃣ Payment account only when paying now (later payments use POST /purchases/:id/payment)
    let payAccount = null;
    if (paidAmount > 0) {
      if (!paymentAccount) {
        throw new AppError('د تادیې لپاره حساب (دخل/تجري/صراف) اړین دی', 400);
      }
      payAccount = await validateAccountBalance(paymentAccount, paidAmount, session);
    }

    // 4️⃣ Calculate totals
    let totalAmount = 0;

    for (const item of items) {
      totalAmount += item.unitPrice * item.quantity;
    }

    const dueAmount = totalAmount - paidAmount;

    // 5️⃣ Create main purchase
    const purchase = await Purchase.create(
      [
        {
          supplier: supplierRefId || supplier,
          supplierAccount: supplierAccount._id,
          supplierName: supplierDoc ? supplierDoc.name : supplierAccount.name,
          purchaseDate,
          description: description || undefined,
          totalAmount,
          paidAmount,
          dueAmount,
          stockLocation, // Store the location
        },
      ],
      { session }
    );

    // 6️⃣ Process purchase items
    for (const item of items) {
      const product = await Product.findById(item.product).session(session);
      if (!product) throw new AppError('ناسم محصول ID', 400);

      const unit = await Unit.findById(item.unit).session(session);
      if (!unit) throw new AppError('ناسم واحد ID', 400);

      assertPurchaseItemUsesPrimaryUnit(product, item.unit);

      const primaryUnit = await loadPrimaryUnitForProduct(product._id, session);
      const stockQty = toStockQuantity(item.quantity, unit, primaryUnit);
      const stockPrice = purchasePriceForStock(item.unitPrice);
      const totalPrice = item.unitPrice * item.quantity;

      // ✅ Assign consistent batch number ONCE
      const batchNum = product.trackByBatch
        ? (item.batchNumber && item.batchNumber.trim() ? item.batchNumber : `AUTO-${Date.now()}-${product._id}`)
        : 'DEFAULT';

      // ✅ Assign expiryDate correctly (even if product is not batch-tracked)
      const expiryDate = item.expiryDate || null;

      // Create purchase item
      await PurchaseItem.create(
        [
          {
            purchase: purchase[0]._id,
            product: product._id,
            unit: unit._id,
            batchNumber: batchNum,
            expiryDate,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice,
          },
        ],
        { session }
      );

      product.latestPurchasePrice = stockPrice;
      await product.save({ session });

      // ✅ Update or insert Stock (quantity in product primary unit)
      await Stock.findOneAndUpdate(
        { product: product._id, batchNumber: batchNum, location: stockLocation },
        {
          $inc: { quantity: stockQty },
          $set: {
            expiryDate,
            purchasePricePerBaseUnit: stockPrice,
            batchNumber: batchNum,
            unit: product.baseUnit,
            location: stockLocation,
          },
        },
        { upsert: true, new: true, session }
      );
    }

    // 7️⃣ ACCOUNT TRANSACTIONS

    // Supplier (Debit)
    await AccountTransaction.create(
      [
        {
          account: supplierAccount._id,
          transactionType: 'Purchase',
          amount: totalAmount,
          referenceType: 'purchase',
          referenceId: purchase[0]._id,
          created_by: req.user._id,
          description: `د تاجر ${supplierAccount.name} څخه رانیول`,
        },
      ],
      { session }
    );

    supplierAccount.currentBalance += totalAmount;
    await supplierAccount.save({ session });

    // Payment Account (Credit) - When paying cashier balance decreases, supplier balance decreases
    if (paidAmount > 0) {
      // Payment reduces cashier balance
      await AccountTransaction.create(
        [
          {
            account: payAccount._id,
            transactionType: 'Payment',
            amount: -paidAmount,
            referenceType: 'purchase',
            referenceId: purchase[0]._id,
            created_by: req.user._id,
          description: `د رانیول لپاره تادیه`,
          },
        ],
        { session }
      );

      payAccount.currentBalance -= paidAmount;
      await payAccount.save({ session });

      // Payment reduces supplier balance (what you owe them)
      await AccountTransaction.create(
        [
          {
            account: supplierAccount._id,
            transactionType: 'Payment',
            amount: -paidAmount,
            referenceType: 'purchase',
            referenceId: purchase[0]._id,
            created_by: req.user._id,
          description: `د رانیول لپاره تادیه`,
          },
        ],
        { session }
      );

      supplierAccount.currentBalance -= paidAmount;
      await supplierAccount.save({ session });
    }

    // 8️⃣ Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: 'رانیول په بریالیتوب سره جوړ شو',
      purchase: purchase[0],
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(err.message || 'رانیول جوړول ناکام شو', 500);
  }
});

// @desc    Get all purchases (paginated, optional search)
// @route   GET /api/v1/purchases
exports.getAllPurchases = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search;
  const supplier = req.query.supplier;
  const status = req.query.status;

  let filter = parseDeletionFilter(req.query);

  // Add supplier filter
  if (supplier) {
    filter.supplier = supplier;
  }

  // Add status filter (payment status)
  if (status) {
    if (status === 'paid') {
      filter.dueAmount = 0;
    } else if (status === 'partial') {
      filter.dueAmount = { $gt: 0 };
      filter.paidAmount = { $gt: 0 };
    } else if (status === 'pending') {
      filter.dueAmount = { $gt: 0 };
      filter.paidAmount = 0;
    }
  }

  // Build search query
  let searchQuery = {};
  if (search) {
    // Search by supplier name (case insensitive)
    const supplierIds = await Supplier.find({
      name: { $regex: search, $options: 'i' }
    }).select('_id');
    
    // Check if search is a valid ObjectId
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(search);
    
    // Build search conditions
    const searchConditions = [];
    
    // Add supplier search if we found matching suppliers
    if (supplierIds.length > 0) {
      searchConditions.push({ supplier: { $in: supplierIds.map(s => s._id) } });
    }
    
    // Add ObjectId search if the search term looks like an ObjectId
    if (isObjectId) {
      try {
        const mongoose = require('mongoose');
        const objectId = new mongoose.Types.ObjectId(search);
        searchConditions.push({ _id: objectId });
      } catch (err) {
        // Invalid ObjectId, skip
      }
    }
    
    // Only apply search if we have conditions
    if (searchConditions.length > 0) {
      searchQuery = { $or: searchConditions };
    }
  }

  // Combine filters
  const finalFilter = { ...filter, ...searchQuery };

  const total = await Purchase.countDocuments(finalFilter);

  const purchases = await Purchase.find(finalFilter)
    .populate('supplierAccount', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  // console.log('purchases fetched:', purchases);
  res.status(200).json({
    success: true,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    results: purchases.length,
    purchases,
  });
});

// @desc    Get single purchase
// @route   GET /api/v1/purchases/:id
exports.getPurchaseById = asyncHandler(async (req, res, next) => {
  const purchase = await Purchase.findById(req.params.id).populate(
    'supplier',
    'name contactInfo'
  ).populate('supplierAccount', 'name');

  if (!purchase || purchase.isDeleted)
    throw new AppError('رانیول ونه موندل شو', 404);

  // Fetch purchase items with populated product and unit
  const items = await PurchaseItem.find({ 
    purchase: purchase._id, 
    isDeleted: false 
  })
    .populate('product', 'name')
    .populate('unit', 'name conversion_to_base');

  res.status(200).json({ 
    success: true,
    purchase: {
      ...purchase.toObject(),
      items
    }
  });
});

// @desc Min quantities / stock constraints when editing a purchase
// @route GET /api/v1/purchases/:id/stock-constraints
exports.getPurchaseStockConstraints = asyncHandler(async (req, res, next) => {
  const purchase = await Purchase.findById(req.params.id).lean();
  if (!purchase || purchase.isDeleted) {
    throw new AppError('رانیول ونه موندل شو', 404);
  }

  const oldItems = await PurchaseItem.find({
    purchase: purchase._id,
    isDeleted: false,
  })
    .populate('product', 'name')
    .populate('unit', 'name conversion_to_base');

  const data = await getPurchaseLineConstraints(purchase, oldItems);

  res.status(200).json({
    success: true,
    data,
  });
});

// @desc Update purchase with items + accounts + stock + audit (transactional)
// @route PUT /api/v1/purchases/:id
exports.updatePurchase = asyncHandler(async (req, res, next) => {
  const { error } = updatePurchaseSchema.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { supplier, purchaseDate, paidAmount, items, reason, paymentAccount, description } =
      req.body;

    // 1️⃣ Fetch existing purchase and items
    const purchase = await Purchase.findById(req.params.id).session(session);
    if (!purchase || purchase.isDeleted)
      throw new AppError('رانیول ونه موندل شو', 404);

    // Stock was received at purchase.stockLocation — edits must reverse/re-apply there only
    const receiptLocation = purchase.stockLocation || 'warehouse';

    const oldItems = await PurchaseItem.find({
      purchase: purchase._id,
    }).session(session);

    const oldDataSnapshot = {
      purchase: { ...purchase.toObject() },
      items: oldItems.map((i) => i.toObject()),
    };

    // 2️⃣ Update purchase core fields
    if (supplier) {
      const supplierExists = await Supplier.findById(supplier).session(session);
      if (!supplierExists) throw new AppError('ناسم تاجر ID', 400);
      purchase.supplier = supplier;

      // Ensure an account exists for new supplier and store a reference snapshot
      const newSupplierAccount = await getOrCreateAccount({
        refId: supplier,
        type: 'supplier',
        name: supplierExists.name,
        session,
      });
      purchase.supplierAccount = newSupplierAccount._id;
      purchase.supplierName = supplierExists.name;
    }

    if (purchaseDate) purchase.purchaseDate = purchaseDate;
    if (description !== undefined) purchase.description = description;
    if (paidAmount !== undefined) {
      // Check if payment account has enough balance (for non-saraf accounts)
      const payTxn = await AccountTransaction.findOne({
        referenceType: 'purchase',
        referenceId: purchase._id,
        transactionType: 'Payment',
      }).session(session);
      
      if (payTxn && paidAmount > 0) {
        await validateAccountBalance(payTxn.account, paidAmount, session);
      }
      
      purchase.paidAmount = paidAmount;
    }

    // Recalculate total and due
    let newTotalAmount = 0;

    // 3️⃣ Update purchase items (delete old + re-add new)
    if (items && items.length > 0) {
      const stockCheck = await validatePurchaseEditStock(
        purchase,
        oldItems,
        items
      );
      if (!stockCheck.valid) {
        throw new AppError(stockCheck.issues[0].messagePs, 400);
      }

      // Reverse previous stock & product prices
      for (const old of oldItems) {
        const unit = await Unit.findById(old.unit).session(session);
        const primaryUnit = await loadPrimaryUnitForProduct(old.product, session);
        const reverseQty = toStockQuantity(old.quantity, unit, primaryUnit);
        await Stock.findOneAndUpdate(
          {
            product: old.product,
            batchNumber: old.batchNumber || 'DEFAULT',
            location: receiptLocation,
          },
          { $inc: { quantity: -reverseQty } },
          { session }
        );
      }

      // Delete old items
      await PurchaseItem.deleteMany({ purchase: purchase._id }).session(
        session
      );

      // Add new items
      for (const item of items) {
        const product = await Product.findById(item.product).session(session);
        if (!product) throw new AppError('ناسم محصول ID', 400);

        const unit = await Unit.findById(item.unit).session(session);
        if (!unit) throw new AppError('ناسم واحد ID', 400);

        assertPurchaseItemUsesPrimaryUnit(product, item.unit);

        const primaryUnit = await loadPrimaryUnitForProduct(product._id, session);
        const stockQty = toStockQuantity(item.quantity, unit, primaryUnit);
        const stockPrice = purchasePriceForStock(item.unitPrice);
        const totalPrice = item.unitPrice * item.quantity;
        newTotalAmount += totalPrice;

        const newBatchNum = product.trackByBatch
          ? (item.batchNumber && item.batchNumber.trim() ? item.batchNumber : `AUTO-${Date.now()}-${product._id}`)
          : 'DEFAULT';

        await Stock.findOneAndUpdate(
          {
            product: product._id,
            batchNumber: newBatchNum,
            location: receiptLocation,
          },
          {
            $inc: { quantity: stockQty },
            $set: {
              expiryDate: item.expiryDate || null,
              purchasePricePerBaseUnit: stockPrice,
              batchNumber: newBatchNum,
              unit: product.baseUnit,
              location: receiptLocation,
            },
          },
          { upsert: true, session }
        );

        product.latestPurchasePrice = stockPrice;
        await product.save({ session });

        // Recreate purchase item
        await PurchaseItem.create(
          [
            {
              purchase: purchase._id,
              product: product._id,
              unit: unit._id,
              batchNumber: newBatchNum,
              expiryDate: item.expiryDate || null,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice,
            },
          ],
          { session }
        );
      }
    } else {
      newTotalAmount = purchase.totalAmount; // keep previous if no items changed
    }

    purchase.totalAmount = newTotalAmount;
    purchase.dueAmount = newTotalAmount - purchase.paidAmount;
    await purchase.save({ session });

    // 4️⃣ Update Account Balances
    // Ensure we have the supplier account; prefer explicit `supplierAccount` on purchase when available
    const supplierAccount = purchase.supplierAccount
      ? await Account.findById(purchase.supplierAccount).session(session)
      : await getOrCreateAccount({ refId: purchase.supplier, type: 'supplier', name: purchase.supplierName || '', session });
    if (!supplierAccount) throw new AppError('د تاجر حساب ونه موندل شو', 404);

    const supplierTxn = await AccountTransaction.findOne({
      referenceType: 'purchase',
      referenceId: purchase._id,
      account: supplierAccount._id,
    }).session(session);

    if (supplierTxn) {
      const diff = newTotalAmount - supplierTxn.amount;
      supplierTxn.amount = newTotalAmount;
      await supplierTxn.save({ session });
      supplierAccount.currentBalance += diff;
      await supplierAccount.save({ session });
    }

    // Update payment transaction if exists
    const payTxn = await AccountTransaction.findOne({
      referenceType: 'purchase',
      referenceId: purchase._id,
      transactionType: 'Payment',
    }).session(session);

    if (payTxn) {
      // If payment account is being changed
      if (paymentAccount && paymentAccount !== payTxn.account.toString()) {
        // Validate new payment account
        const newPayAcc = await validateAccountBalance(paymentAccount, paidAmount, session);
        
        // Reverse old payment account
        const oldPayAcc = await Account.findById(payTxn.account).session(session);
        oldPayAcc.currentBalance += Math.abs(payTxn.amount);
        await oldPayAcc.save({ session });
        
        // Update transaction to new account
        payTxn.account = newPayAcc._id;
        payTxn.amount = -paidAmount;
        payTxn.transactionType = 'Payment';
        if (!payTxn.created_by)
          payTxn.created_by = req.user?._id || payTxn.created_by;
        await payTxn.save({ session });
        
        // Update new payment account
        newPayAcc.currentBalance -= paidAmount;
        await newPayAcc.save({ session });
      } else {
        // Just update amount for same account
        const payAcc = await Account.findById(payTxn.account).session(session);
        const diff = paidAmount - Math.abs(payTxn.amount);
        payAcc.currentBalance -= diff;
        await payAcc.save({ session });
        payTxn.amount = -paidAmount;
        // ensure transactionType and created_by are consistent for payment records
        payTxn.transactionType = 'Payment';
        if (!payTxn.created_by)
          payTxn.created_by = req.user?._id || payTxn.created_by;
        await payTxn.save({ session });
      }
    }

    // 5️⃣ Audit Log entry
    const newItems = await PurchaseItem.find({
      purchase: purchase._id,
    }).session(session);
    const newDataSnapshot = {
      purchase: { ...purchase.toObject() },
      items: newItems.map((i) => i.toObject()),
    };

    await AuditLog.create(
      [
        {
          tableName: 'Purchase',
          recordId: purchase._id,
          operation: 'UPDATE',
          oldData: oldDataSnapshot,
          newData: newDataSnapshot,
          reason: reason || 'Purchase updated',
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    // 6️⃣ Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'رانیول په بریالیتوب سره تازه شو (تراکنش)',
      purchase,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(err.message || 'رانیول تازه کول ناکام شو', 500);
  }
});

// @desc    Soft delete purchase (rollback-safe)
// @route   DELETE /api/v1/purchases/:id
exports.softDeletePurchase = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const purchase = await Purchase.findById(req.params.id).session(session);
    if (!purchase || purchase.isDeleted)
      throw new AppError('رانیول ونه موندل شو', 404);

    await assertNoActivePurchaseReturns(session, purchase._id);

    const items = await PurchaseItem.find({ purchase: purchase._id }).session(
      session
    );

    // 1️⃣ Reverse stock still at receipt location (not full qty if transferred/sold)
    await undoPurchaseStockForDelete(session, purchase, items);

    // 2️⃣ Reverse all active account transactions (supplier, cashier, payments)
    await undoPurchaseAccountTransactions(session, purchase._id);

    // 3️⃣ Soft delete the purchase
    markSoftDeleted(purchase, req.user?._id);
    await purchase.save({ session });

    // 5️⃣ Log Audit
    await AuditLog.create(
      [
        {
          tableName: 'Purchase',
          recordId: purchase._id,
          operation: 'DELETE',
          oldData: { purchase, items },
          newData: null,
          reason: 'Purchase deleted (stock & accounts reversed)',
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'رانیول په بریالیتوب سره حذف شو',
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(err.message || 'رانیول حذفول ناکام شو', 500);
  }
});

// @desc    Restore soft-deleted purchase (rollback-safe)
// @route   PATCH /api/v1/purchases/:id/restore
exports.restorePurchase = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const purchase = await Purchase.findById(req.params.id).session(session);
    if (!purchase || !purchase.isDeleted)
      throw new AppError('رانیول ونه موندل شو یا حذف شوی نه دی', 404);

    const items = await PurchaseItem.find({ purchase: purchase._id }).session(
      session
    );
    // 1️⃣ Restore stock amounts removed on delete (matches stockReversedBase per line)
    await redoPurchaseStockForRestore(session, purchase, items);

    // 2️⃣ Re-activate original account transactions (exact inverse of soft-delete)
    await redoPurchaseAccountTransactions(session, purchase._id, purchase);

    // 3️⃣ Restore purchase itself
    markRestored(purchase);
    await purchase.save({ session });

    // 4️⃣ Audit Log
    await AuditLog.create(
      [
        {
          tableName: 'Purchase',
          recordId: purchase._id,
          operation: 'RESTORE',
          oldData: null,
          newData: { purchase, items },
          reason: req.body.reason || 'Purchase restored (stock & accounts re-applied)',
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'رانیول په بریالیتوب سره بیرته راستون شو',
      purchase,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(err.message || 'رانیول بیرته راستنول ناکام شو', 500);
  }
});

// @desc Record additional payment against a purchase
// @route POST /api/v1/purchases/:id/payment
exports.recordPurchasePayment = asyncHandler(async (req, res, next) => {
  const { amount, paymentAccount, description } = req.body;
  const purchaseId = req.params.id;

  if (!purchaseId || purchaseId === 'null' || purchaseId === 'undefined') {
    throw new AppError('سم د رانیول ID اړین دی', 400);
  }

  if (!amount || amount <= 0) {
    throw new AppError('د تادیې مبلغ باید له 0 څخه زیات وي', 400);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1️⃣ Find the purchase
    const purchase = await Purchase.findById(purchaseId).session(session);
    if (!purchase || purchase.isDeleted) {
      throw new AppError('رانیول ونه موندل شو', 404);
    }

    // 2️⃣ Calculate remaining due
    const remainingDue = purchase.totalAmount - purchase.paidAmount;
    
    if (amount > remainingDue) {
      throw new AppError(
        `د تادیې مبلغ (${amount}) د پاتې پور (${remainingDue}) څخه زیات دی`,
        400
      );
    }

    // 3️⃣ Find supplier account (prefer explicit reference on purchase)
    const supplierAccount = purchase.supplierAccount
      ? await Account.findById(purchase.supplierAccount).session(session)
      : await Account.findOne({ refId: purchase.supplier, type: 'supplier', isDeleted: false }).session(session);

    if (!supplierAccount) {
      throw new AppError('د تاجر حساب ونه موندل شو', 404);
    }

    // 4️⃣ Validate payment account and check balance
    const payAccount = await validateAccountBalance(paymentAccount, amount, session);

    // 5️⃣ Create payment transactions
    // Reduce cashier balance
    await AccountTransaction.create(
      [
        {
          account: payAccount._id,
          transactionType: 'Payment',
          amount: -amount,
          referenceType: 'purchase',
          referenceId: purchase._id,
          created_by: req.user._id,
          description: description || `د رانیول لپاره اضافي تادیه`,
        },
      ],
      { session }
    );

    payAccount.currentBalance -= amount;
    await payAccount.save({ session });

    // Reduce supplier balance
    await AccountTransaction.create(
      [
        {
          account: supplierAccount._id,
          transactionType: 'Payment',
          amount: -amount,
          referenceType: 'purchase',
          referenceId: purchase._id,
          created_by: req.user._id,
          description: description || `د رانیول لپاره اضافي تادیه`,
        },
      ],
      { session }
    );

    supplierAccount.currentBalance -= amount;
    await supplierAccount.save({ session });

    // 6️⃣ Update purchase paid amount
    purchase.paidAmount += amount;
    purchase.dueAmount = purchase.totalAmount - purchase.paidAmount;
    await purchase.save({ session });

    // 7️⃣ Audit Log
    await AuditLog.create(
      [
        {
          tableName: 'Purchase',
          recordId: purchase._id,
          operation: 'UPDATE',
          oldData: { paidAmount: purchase.paidAmount - amount },
          newData: { paidAmount: purchase.paidAmount },
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
      purchase: {
        _id: purchase._id,
        totalAmount: purchase.totalAmount,
        paidAmount: purchase.paidAmount,
        dueAmount: purchase.dueAmount,
      },
      paymentAmount: amount,
      supplierBalance: supplierAccount.currentBalance,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(err.message || 'تادیه ثبتول ناکام شو', 500);
  }
});

/**
 * @desc    Get purchase reports by date range (daily/monthly)
 * @route   GET /api/v1/purchases/reports
 */
exports.getPurchaseReports = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, groupBy = 'day' } = req.query;

  if (!startDate || !endDate) {
    throw new AppError('د پیل او پای نیټه اړینه ده', 400);
  }

  const matchStage = {
    isDeleted: false,
    purchaseDate: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  };

  let groupStage;
  
  switch (groupBy) {
    case 'day':
      groupStage = {
        _id: {
          year: { $year: '$purchaseDate' },
          month: { $month: '$purchaseDate' },
          day: { $dayOfMonth: '$purchaseDate' },
        },
      };
      break;
    case 'week':
      groupStage = {
        _id: {
          year: { $year: '$purchaseDate' },
          week: { $week: '$purchaseDate' },
        },
      };
      break;
    case 'month':
      groupStage = {
        _id: {
          year: { $year: '$purchaseDate' },
          month: { $month: '$purchaseDate' },
        },
      };
      break;
    default:
      throw new AppError(
        'ناسم groupBy پیرامیټر. باید ورځ، اونۍ، یا میاشت وي',
        400
      );
  }

  // Get purchases summary
  const purchasesSummary = await Purchase.aggregate([
    { $match: matchStage },
    {
      $group: {
        ...groupStage,
        totalPurchases: { $sum: '$totalAmount' },
        totalPaid: { $sum: '$paidAmount' },
        totalDue: { $sum: '$dueAmount' },
        purchasesCount: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
  ]);

  // Format dates for frontend
  const formattedSummary = purchasesSummary.map(item => {
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
      purchases: item.totalPurchases,
      paid: item.totalPaid,
      due: item.totalDue,
      count: item.purchasesCount,
    };
  });

  res.status(200).json({
    success: true,
    data: {
      period: { startDate, endDate },
      groupBy,
      summary: formattedSummary,
      totals: {
        totalPurchases: formattedSummary.reduce((sum, item) => sum + item.purchases, 0),
        totalPaid: formattedSummary.reduce((sum, item) => sum + item.paid, 0),
        totalDue: formattedSummary.reduce((sum, item) => sum + item.due, 0),
        totalCount: formattedSummary.reduce((sum, item) => sum + item.count, 0),
      },
    },
  });
});

// @desc    Permanently delete a soft-deleted purchase
// @route   DELETE /api/v1/purchases/:id/permanent
exports.permanentDeletePurchase = asyncHandler(async (req, res, next) => {
  validateObjectId(req.params.id, 'ناسم رانیول ID');

  const purchase = await Purchase.findById(req.params.id);
  if (!purchase) throw new AppError('رانیول ونه موندل شو', 404);
  if (!purchase.isDeleted) {
    throw new AppError('لومړی باید رانیول په کثافاتو کې حذف شوی وي', 400);
  }

  await assertNoActivePurchaseReturns(null, purchase._id);

  await PurchaseItem.deleteMany({ purchase: purchase._id });
  await AccountTransaction.deleteMany({
    referenceType: 'purchase',
    referenceId: purchase._id,
  });
  await Purchase.deleteOne({ _id: purchase._id });

  res.status(200).json({
    success: true,
    message: 'رانیول په تل لپاره حذف شو',
  });
});