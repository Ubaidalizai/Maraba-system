const mongoose = require('mongoose');
const asyncHandler = require('../middlewares/asyncHandler');
const AppError = require('../utils/AppError');
const Purchase = require('../models/purchase.model');
const PurchaseItem = require('../models/purchaseItem.model');
const PurchaseReturn = require('../models/purchaseReturn.model');
const Unit = require('../models/unit.model');
const AuditLog = require('../models/auditLog.model');
const { createPurchaseReturnSchema } = require('../validations/purchaseReturn.validation');
const {
  toBaseQty,
  computeLineCreditAmount,
  computeRequiredCashFromSupplier,
  assertCreditAmountAllowed,
  assertPurchaseReturnQuantityAllowed,
  applyPurchaseItemReturnDeduction,
  revertPurchaseItemReturnDeduction,
  applyPurchaseReturnStock,
  reversePurchaseReturnStock,
  applyPurchaseTotalsAfterReturn,
  resolvePayableReturnCredit,
  applyPurchaseReturnAccounts,
  reversePostedPurchaseReturnAccounts,
  getActivePurchaseItems,
  resolveReturnLineCredit,
} = require('../utils/purchaseReturnHelpers');
const {
  toStockQuantity,
  loadPrimaryUnitForProduct,
} = require('../utils/primaryUnitStock');

// @desc    Return a purchase item to supplier
// @route   POST /api/v1/purchases/returns
exports.returnPurchaseItem = asyncHandler(async (req, res, next) => {
  const { error, value } = createPurchaseReturnSchema.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400);

  const {
    purchaseId,
    purchaseItemId,
    unitId,
    quantity,
    creditAmount,
    cashRefundAmount = 0,
    reason,
    batchNumber,
  } = value;

  if (cashRefundAmount > creditAmount) {
    throw new AppError(
      'نغدي ترلاسه کول باید له ټولیز بیرته راستنولو مبلغ څخه زیات نه وي',
      400
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const purchase = await Purchase.findById(purchaseId).session(session);
    if (!purchase || purchase.isDeleted) {
      throw new AppError('رانیول ونه موندل شو', 404);
    }

    if (cashRefundAmount > purchase.paidAmount) {
      throw new AppError('نغدي ترلاسه کول له تادیه شوي مقدار څخه زیات دی', 400);
    }

    const requiredCash = computeRequiredCashFromSupplier(purchase, creditAmount);
    if (requiredCash > 0 && cashRefundAmount + 0.01 < requiredCash) {
      throw new AppError(
        `د نغدو ترلاسه کولو مبلغ اړین دی: ${requiredCash} افغانۍ (د تادیه شوي برخې سره برابر)`,
        400
      );
    }

    const unit = await Unit.findById(unitId).session(session);
    if (!unit) throw new AppError('ناسم واحد ID', 400);

    const item = await PurchaseItem.findOne({
      _id: purchaseItemId,
      purchase: purchaseId,
      isDeleted: { $ne: true },
    }).session(session);

    if (!item) throw new AppError('د رانیول توکی ونه موندل شو', 404);

    const lineCredit = computeLineCreditAmount(item, quantity);
    assertCreditAmountAllowed(purchase, item, quantity, creditAmount);

    const baseQty = await assertPurchaseReturnQuantityAllowed({
      session,
      purchase,
      purchaseItem: item,
      returnUnit: unit,
      quantity,
      batchNumberFromRequest: batchNumber,
    });

    const oldItemSnapshot = { ...item.toObject() };
    const oldPurchaseSnapshot = { ...purchase.toObject() };

    applyPurchaseItemReturnDeduction({
      purchaseItem: item,
      quantity,
      creditAmount: lineCredit,
    });
    await item.save({ session });

    const primaryUnit = await loadPrimaryUnitForProduct(item.product, session);
    const stockQty = toStockQuantity(quantity, unit, primaryUnit);

    const recordedBatch = await applyPurchaseReturnStock({
      session,
      purchase,
      purchaseItem: item,
      stockQty,
      baseQty,
      batchNumberFromRequest: batchNumber,
    });

    const purchaseReturn = await PurchaseReturn.create(
      [
        {
          purchase: purchaseId,
          purchaseItem: purchaseItemId,
          product: item.product,
          unit: unitId,
          batchNumber: recordedBatch,
          quantity,
          creditAmount,
          lineCreditAmount: lineCredit,
          cashRefundAmount,
          stockQtyRemoved: stockQty,
          reason,
          handledBy: req.user._id,
        },
      ],
      { session }
    );

    const purchaseDueSnapshot = {
      totalAmount: purchase.totalAmount,
      paidAmount: purchase.paidAmount,
    };

    const activeItems = await getActivePurchaseItems(session, purchaseId);
    const { payableAdjustment } = applyPurchaseTotalsAfterReturn(
      purchase,
      activeItems
    );
    const payableReduced = resolvePayableReturnCredit(
      purchaseDueSnapshot,
      payableAdjustment,
      creditAmount
    );

    const accountResult = await applyPurchaseReturnAccounts({
      session,
      purchase,
      payableReduced,
      cashRefundAmount,
      purchaseReturnId: purchaseReturn[0]._id,
      userId: req.user._id,
      reverse: false,
    });

    purchaseReturn[0].payableReduced = payableReduced;
    purchaseReturn[0].cashRefundAccount = accountResult.cashRefundAccountId;
    await purchaseReturn[0].save({ session });

    await purchase.save({ session });

    await AuditLog.create(
      [
        {
          tableName: 'PurchaseReturn',
          recordId: purchaseReturn[0]._id,
          operation: 'INSERT',
          oldData: {
            purchase: oldPurchaseSnapshot,
            item: oldItemSnapshot,
          },
          newData: {
            purchase: { ...purchase.toObject() },
            item: { ...item.toObject() },
            returnedItem: purchaseReturn[0],
          },
          reason: reason || 'Purchase item returned to supplier',
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'محصول په بریالیتوب سره تاجر ته بیرته راستون شو',
      purchaseReturn: purchaseReturn[0],
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(
      err.message || 'د رانیول بیرته راستنیدو په پروسس کولو کې ناکامي',
      err.statusCode || 500
    );
  }
});

// @desc    Get all purchase returns (paginated)
// @route   GET /api/v1/purchases/returns
exports.getAllPurchaseReturns = asyncHandler(async (req, res, next) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const query = { isDeleted: false };
  if (req.query.purchaseId) {
    if (!mongoose.Types.ObjectId.isValid(req.query.purchaseId)) {
      throw new AppError('ناسم د رانیول ID', 400);
    }
    query.purchase = req.query.purchaseId;
  }

  const [returns, total] = await Promise.all([
    PurchaseReturn.find(query)
      .populate('purchase', 'purchaseDate totalAmount paidAmount dueAmount')
      .populate('product', 'name')
      .populate('unit', 'name')
      .populate('handledBy', 'name email')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    PurchaseReturn.countDocuments(query),
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

// @desc    Get single purchase return details
// @route   GET /api/v1/purchases/returns/:id
exports.getPurchaseReturn = asyncHandler(async (req, res, next) => {
  const purchaseReturn = await PurchaseReturn.findOne({
    _id: req.params.id,
    isDeleted: false,
  })
    .populate('purchase', 'purchaseDate totalAmount paidAmount dueAmount')
    .populate('product', 'name')
    .populate('unit', 'name conversion_to_base')
    .populate('handledBy', 'name email');

  if (!purchaseReturn) {
    throw new AppError('د رانیول بیرته راستنیدنه ونه موندل شوه', 404);
  }

  res.status(200).json({
    success: true,
    data: purchaseReturn,
  });
});

// @desc    Soft delete a purchase return (rollback-safe)
// @route   DELETE /api/v1/purchases/returns/:id
exports.deletePurchaseReturn = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const purchaseReturn = await PurchaseReturn.findById(req.params.id).session(
      session
    );
    if (!purchaseReturn || purchaseReturn.isDeleted) {
      throw new AppError('د رانیول بیرته راستنیدنه ونه موندل شوه', 404);
    }

    const purchase = await Purchase.findById(purchaseReturn.purchase).session(
      session
    );
    if (!purchase || purchase.isDeleted) {
      throw new AppError('اصلي رانیول ونه موندل شو', 404);
    }

    const oldReturnSnapshot = { ...purchaseReturn.toObject() };

    const unit = await Unit.findById(purchaseReturn.unit).session(session);
    if (!unit) throw new AppError('د بیرته راستنیدنې واحد ونه موندل شو', 400);
    const baseQty = toBaseQty(purchaseReturn.quantity, unit);
    const primaryUnit = await loadPrimaryUnitForProduct(
      purchaseReturn.product,
      session
    );
    const stockQty = toStockQuantity(
      purchaseReturn.quantity,
      unit,
      primaryUnit
    );

    const purchaseItem = await PurchaseItem.findById(
      purchaseReturn.purchaseItem
    ).session(session);

    await reversePurchaseReturnStock({
      session,
      purchase,
      purchaseItem,
      purchaseReturn,
      stockQty,
      baseQty,
    });

    await reversePostedPurchaseReturnAccounts({
      session,
      purchase,
      purchaseReturn,
      purchaseReturnId: purchaseReturn._id,
      userId: req.user._id,
    });

    if (purchaseItem) {
      const lineCredit = resolveReturnLineCredit(purchaseReturn, purchaseItem);
      revertPurchaseItemReturnDeduction({
        purchaseItem,
        quantity: purchaseReturn.quantity,
        creditAmount: lineCredit,
      });
      await purchaseItem.save({ session });

      const activeItems = await getActivePurchaseItems(session, purchaseReturn.purchase);
      applyPurchaseTotalsAfterReturn(purchase, activeItems);
    }
    await purchase.save({ session });

    purchaseReturn.isDeleted = true;
    await purchaseReturn.save({ session });

    await AuditLog.create(
      [
        {
          tableName: 'PurchaseReturn',
          recordId: purchaseReturn._id,
          operation: 'DELETE',
          oldData: oldReturnSnapshot,
          reason: req.body.reason || 'Purchase return soft deleted',
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'د رانیول بیرته راستنیدنه په بریالیتوب سره لغوه شوه',
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(
      err.message || 'د رانیول بیرته راستنیدنې په لغوه کولو کې ناکامي',
      err.statusCode || 500
    );
  }
});

