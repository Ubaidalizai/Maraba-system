const AppError = require('./AppError');
const Account = require('../models/account.model');
const AccountTransaction = require('../models/accountTransaction.model');

const CASH_ACCOUNT_TYPES = new Set(['cashier', 'safe', 'saraf']);
const Stock = require('../models/stock.model');
const Product = require('../models/product.model');
const EmployeeStock = require('../models/employeeStock.model');
const Unit = require('../models/unit.model');
const SaleItem = require('../models/saleItem.model');
const SaleReturn = require('../models/saleReturn.model');

/** costPricePerUnit on SaleItem is per base unit */
const returnedCostForBaseQty = (saleItem, baseQty) =>
  (saleItem.costPricePerUnit || 0) * baseQty;

const {
  toStockQuantity,
  toMathBaseQuantity,
  primaryConversion,
  loadPrimaryUnitForProduct,
} = require('./primaryUnitStock');

const toBaseQty = (quantity, unit) => quantity * unit.conversion_to_base;

const sumActiveItemsSubtotal = (items) =>
  items
    .filter((i) => !i.isDeleted && (i.quantity || 0) > 0)
    .reduce((sum, i) => sum + (i.totalPrice || 0), 0);

const computeLineRefundPreDiscount = (saleItem, quantity) => {
  const lineQty = saleItem.quantity || 0;
  if (lineQty <= 0 || quantity <= 0) return 0;
  return Math.round(((saleItem.totalPrice || 0) / lineQty) * quantity * 100) / 100;
};

/** Customer-facing refund after sale-level discount is applied */
const computeEffectiveCustomerRefund = (sale, lineRefundPreDiscount) => {
  const subtotal = sale.subtotalAmount || 0;
  const discount = sale.discountAmount || 0;
  if (subtotal <= 0 || lineRefundPreDiscount <= 0) return lineRefundPreDiscount;
  const factor = 1 - discount / subtotal;
  return Math.round(lineRefundPreDiscount * factor * 100) / 100;
};

const recalculateSaleTotalsFromItems = (sale, items) => {
  const priorSubtotal = sale.subtotalAmount || 0;
  const priorDiscount = sale.discountAmount || 0;
  const newSubtotal = sumActiveItemsSubtotal(items);

  let newDiscount = 0;
  if (newSubtotal > 0 && priorSubtotal > 0) {
    newDiscount =
      Math.round(priorDiscount * (newSubtotal / priorSubtotal) * 100) / 100;
  }
  newDiscount = Math.min(newDiscount, newSubtotal);

  const totalAmount = Math.max(0, newSubtotal - newDiscount);
  const paid = Math.max(0, sale.paidAmount || 0);

  return {
    subtotalAmount: newSubtotal,
    discountAmount: newDiscount,
    totalAmount,
    dueAmount: Math.max(0, totalAmount - paid),
  };
};

const resolveReturnLineRefund = (saleReturn, saleItem) =>
  saleReturn.lineRefundAmount ??
  computeLineRefundPreDiscount(saleItem, saleReturn.quantity) ??
  (saleItem.unitPrice || 0) * saleReturn.quantity;

const assertRefundAmountAllowed = (sale, saleItem, quantity, refundAmount) => {
  const linePre = computeLineRefundPreDiscount(saleItem, quantity);
  const maxRefund = Math.min(
    computeEffectiveCustomerRefund(sale, linePre),
    sale.totalAmount || 0
  );

  if (refundAmount > maxRefund + 0.01) {
    throw new AppError(
      `د بیرته ورکولو مبلغ (${refundAmount}) له اجازه شوي حد (${maxRefund}) څخه زیات دی. د تخفیف وروسته اعظمي مبلغ وکاروئ.`,
      400
    );
  }
};

const getSaleDueAmount = (sale) =>
  Math.max(0, (sale.totalAmount || 0) - (sale.paidAmount || 0));

/**
 * Customer receivable credit on return — only reduces outstanding due.
 * Paid portions are reversed via cashRefundAmount, not receivable.
 */
const resolveReceivableReturnCredit = (sale, receivableAdjustment) => {
  const previousDue = getSaleDueAmount(sale);
  const adjustment = Math.max(0, receivableAdjustment || 0);
  return Math.min(adjustment, previousDue);
};

/** Cash to return when sale was partially paid (proportional to refund). */
const computeRequiredCashRefund = (sale, refundAmount) => {
  const paid = Math.max(0, sale.paidAmount || 0);
  const total = Math.max(0, sale.totalAmount || 0);
  const refund = Math.max(0, refundAmount || 0);
  if (paid <= 0 || refund <= 0 || total <= 0) return 0;
  return Math.round((paid * refund) / total * 100) / 100;
};

const applySaleTotalsAfterReturn = (sale, activeItems) => {
  const previousTotal = sale.totalAmount || 0;
  const totals = recalculateSaleTotalsFromItems(sale, activeItems);
  Object.assign(sale, totals);
  return {
    previousTotal,
    receivableAdjustment: Math.max(0, previousTotal - totals.totalAmount),
  };
};

const getActiveSaleItems = async (session, saleId) =>
  SaleItem.find({ sale: saleId, isDeleted: { $ne: true } }).session(session);

const resolveStoreReturnBatch = (saleItem, batchNumberFromRequest) => {
  let targetBatch = batchNumberFromRequest;
  if (!targetBatch) {
    const originalBatch = saleItem.batchNumber || 'DEFAULT';
    if (originalBatch === 'MULTI') {
      throw new AppError(
        'د څو بیچونو څخه پلورل شوي توکو بیرته راستنیدو لپاره د بیچ شمیره اړینه ده',
        400
      );
    }
    targetBatch = originalBatch;
  }
  return targetBatch || 'DEFAULT';
};

const resolveEmployeeReturnBatch = (saleItem) => {
  const b = saleItem.batchNumber;
  if (b && b !== 'MULTI') return b;
  return 'DEFAULT';
};

const getStockBatchMeta = async (session, productId, batchNumber) => {
  const stock = await Stock.findOne({
    product: productId,
    batchNumber: batchNumber || 'DEFAULT',
    location: 'store',
    isDeleted: { $ne: true },
  }).session(session);

  return {
    purchasePricePerBaseUnit: stock?.purchasePricePerBaseUnit,
    expiryDate: stock?.expiryDate ?? null,
  };
};

const incrementStoreStock = async ({
  session,
  productId,
  batchNumber,
  stockQty,
  baseQty,
  purchasePricePerBaseUnit,
  expiryDate,
}) => {
  const qty = stockQty ?? baseQty;
  const stockQuery = {
    product: productId,
    batchNumber,
    location: 'store',
  };

  let existing = await Stock.findOne({
    ...stockQuery,
    isDeleted: false,
  }).session(session);

  if (!existing) {
    existing = await Stock.findOne({
      ...stockQuery,
      isDeleted: true,
    }).session(session);
    if (existing) {
      existing.isDeleted = false;
      existing.deletedAt = null;
      existing.deletedBy = null;
      existing.restoredAt = new Date();
    }
  }

  if (existing) {
    existing.quantity += qty;
    if (
      purchasePricePerBaseUnit != null &&
      (existing.purchasePricePerBaseUnit == null ||
        existing.purchasePricePerBaseUnit === 0)
    ) {
      existing.purchasePricePerBaseUnit = purchasePricePerBaseUnit;
    }
    if (expiryDate != null && existing.expiryDate == null) {
      existing.expiryDate = expiryDate;
    }
    await existing.save({ session });
    return;
  }

  const product = await Product.findById(productId).session(session);
  if (!product) throw new AppError('محصول ونه موندل شو', 404);

  await Stock.create(
    [
      {
        product: productId,
        unit: product.baseUnit,
        batchNumber,
        location: 'store',
        quantity: qty,
        purchasePricePerBaseUnit:
          purchasePricePerBaseUnit ?? product.latestPurchasePrice ?? 0,
        expiryDate: expiryDate ?? null,
      },
    ],
    { session }
  );
};

const resolveReturnStockBatches = (saleItem, stockQty, batchNumberFromRequest) => {
  if (batchNumberFromRequest) {
    return [
      {
        batchNumber: batchNumberFromRequest,
        quantityUsed: stockQty,
        costPerUnit: saleItem.costPricePerUnit || 0,
      },
    ];
  }

  if (saleItem.batchesUsed?.length) {
    const totalUsed = saleItem.batchesUsed.reduce(
      (sum, b) => sum + (b.quantityUsed || 0),
      0
    );

    if (totalUsed > 0 && Math.abs(stockQty - totalUsed) < 1e-6) {
      return saleItem.batchesUsed.map((b) => ({
        batchNumber: b.batchNumber || 'DEFAULT',
        quantityUsed: b.quantityUsed,
        costPerUnit: b.costPerUnit || saleItem.costPricePerUnit || 0,
      }));
    }

    let remaining = stockQty;
    const restored = [];
    for (const b of [...saleItem.batchesUsed].reverse()) {
      if (remaining <= 1e-9) break;
      const take = Math.min(remaining, b.quantityUsed || 0);
      if (take <= 0) continue;
      restored.push({
        batchNumber: b.batchNumber || 'DEFAULT',
        quantityUsed: take,
        costPerUnit: b.costPerUnit || saleItem.costPricePerUnit || 0,
      });
      remaining -= take;
    }
    if (restored.length) return restored;
  }

  const batch = resolveStoreReturnBatch(saleItem, batchNumberFromRequest);
  return [
    {
      batchNumber: batch,
      quantityUsed: stockQty,
      costPerUnit: saleItem.costPricePerUnit || 0,
    },
  ];
};

const applyStoreReturnStock = async ({
  session,
  productId,
  saleItem,
  stockQty,
  baseQty,
  batchNumberFromRequest,
}) => {
  const qty = stockQty ?? baseQty;
  const batches = resolveReturnStockBatches(
    saleItem,
    qty,
    batchNumberFromRequest
  );

  for (const b of batches) {
    const batchMeta = await getStockBatchMeta(session, productId, b.batchNumber);
    await incrementStoreStock({
      session,
      productId,
      batchNumber: b.batchNumber,
      stockQty: b.quantityUsed,
      purchasePricePerBaseUnit:
        b.costPerUnit ?? batchMeta.purchasePricePerBaseUnit,
      expiryDate: batchMeta.expiryDate,
    });
  }

  return batches;
};

const mapRestoredBatchesForStorage = (batches) =>
  (batches || []).map((b) => ({
    batchNumber: b.batchNumber || 'DEFAULT',
    quantityUsed: b.quantityUsed,
  }));

const resolveUndoReturnStockBatches = ({
  saleReturn,
  saleItem,
  stockQty,
  baseQty,
}) => {
  const qty = stockQty ?? baseQty;
  const stored = saleReturn?.stockRestoredBatches?.filter(
    (b) => (b.quantityUsed || 0) > 0
  );
  if (stored?.length) {
    return stored.map((b) => ({
      batchNumber: b.batchNumber || 'DEFAULT',
      quantityUsed: b.quantityUsed,
    }));
  }

  const batchHint =
    saleReturn?.batchNumber && saleReturn.batchNumber !== 'MULTI'
      ? saleReturn.batchNumber
      : undefined;
  return resolveReturnStockBatches(saleItem, qty, batchHint);
};

const reverseStoreReturnStock = async ({
  session,
  productId,
  saleItem,
  saleReturn,
  stockQty,
  baseQty,
}) => {
  const batches = resolveUndoReturnStockBatches({
    saleReturn,
    saleItem,
    stockQty,
    baseQty,
  });

  for (const b of batches) {
    await decrementStoreStock({
      session,
      productId,
      batchNumber: b.batchNumber,
      stockQty: b.quantityUsed,
      strict: true,
    });
  }
};

const reverseEmployeeReturnStock = async ({
  session,
  employee,
  productId,
  saleItem,
  saleReturn,
  stockQty,
  baseQty,
}) => {
  const batches = resolveUndoReturnStockBatches({
    saleReturn,
    saleItem,
    stockQty,
    baseQty,
  });

  for (const b of batches) {
    await decrementEmployeeStock({
      session,
      employee,
      productId,
      batchNumber: b.batchNumber,
      stockQty: b.quantityUsed,
    });
  }
};

const decrementStoreStock = async ({
  session,
  productId,
  batchNumber,
  stockQty,
  baseQty,
  strict = false,
}) => {
  const qty = stockQty ?? baseQty;
  const stock = await Stock.findOne({
    product: productId,
    batchNumber: batchNumber || 'DEFAULT',
    location: 'store',
    isDeleted: false,
  }).session(session);

  if (!stock) {
    if (strict) {
      throw new AppError(
        `د بیرته راستنیدنې لغوه کولو لپاره سټاک ونه موندل شو (بیچ: ${batchNumber || 'DEFAULT'})`,
        400
      );
    }
    return;
  }

  if (strict && stock.quantity + 1e-9 < qty) {
    throw new AppError(
      `ناکافي سټاک د بیرته راستنیدنې لغوه کولو لپاره. موجود: ${stock.quantity}, اړین: ${qty}`,
      400
    );
  }

  stock.quantity -= qty;
  if (stock.quantity < 0) stock.quantity = 0;
  await stock.save({ session });
};

const incrementEmployeeStock = async ({
  session,
  employee,
  productId,
  batchNumber,
  stockQty,
  baseQty,
  costPerUnit,
}) => {
  const qty = stockQty ?? baseQty;
  await EmployeeStock.findOneAndUpdate(
    { employee, product: productId, batchNumber },
    {
      $inc: { quantity_in_hand: qty },
      $setOnInsert: {
        purchasePricePerBaseUnit: costPerUnit ?? 0,
        batchNumber,
      },
    },
    { upsert: true, session }
  );
};

const decrementEmployeeStock = async ({
  session,
  employee,
  productId,
  batchNumber,
  stockQty,
  baseQty,
}) => {
  const qty = stockQty ?? baseQty;
  await EmployeeStock.findOneAndUpdate(
    { employee, product: productId, batchNumber: batchNumber || 'DEFAULT' },
    { $inc: { quantity_in_hand: -qty } },
    { session }
  );
};

const assertReturnQuantityAllowed = async ({
  session,
  saleItem,
  returnUnit,
  quantity,
  extraBaseAllowance = 0,
}) => {
  const itemUnit = await Unit.findById(saleItem.unit).session(session);
  if (!itemUnit) throw new AppError('د پلور توکي واحد ونه موندل شو', 400);

  const primaryUnit = await loadPrimaryUnitForProduct(saleItem.product, session);
  const maxStock =
    toStockQuantity(saleItem.quantity, itemUnit, primaryUnit) +
    extraBaseAllowance / primaryConversion(primaryUnit);
  const returnStock = toStockQuantity(quantity, returnUnit, primaryUnit);
  const returnBase = toMathBaseQuantity(quantity, returnUnit);

  if (returnStock > maxStock + 1e-9) {
    throw new AppError('ناسم بیرته راستنیدونکی مقدار', 400);
  }

  return returnBase;
};

const getReceivableAccount = async (session, sale) => {
  if (sale.customer) {
    if (sale.customerAccount) {
      const acc = await Account.findById(sale.customerAccount).session(session);
      if (acc && !acc.isDeleted) return acc;
    }
    return Account.findOne({
      refId: sale.customer,
      type: 'customer',
      isDeleted: false,
    }).session(session);
  }

  if (sale.employee) {
    if (sale.employeeAccount) {
      const acc = await Account.findById(sale.employeeAccount).session(session);
      if (acc && !acc.isDeleted) return acc;
    }
    return Account.findOne({
      refId: sale.employee,
      type: 'employee',
      isDeleted: false,
    }).session(session);
  }

  return null;
};

/** Find cashier/safe account that received payments for this sale. */
const resolveCashRefundAccount = async (session, sale, cashRefundAmount) => {
  if (sale.placedIn) {
    const fromSale = await Account.findById(sale.placedIn).session(session);
    if (fromSale && !fromSale.isDeleted) return fromSale;
  }

  const paymentTxns = await AccountTransaction.find({
    referenceType: 'sale',
    referenceId: sale._id,
    transactionType: 'Payment',
    amount: { $gt: 0 },
    isDeleted: { $ne: true },
  })
    .session(session)
    .populate('account');

  const totalsByAccount = new Map();
  for (const txn of paymentTxns) {
    const acc = txn.account;
    if (!acc || acc.isDeleted || !CASH_ACCOUNT_TYPES.has(acc.type)) continue;
    const id = acc._id.toString();
    totalsByAccount.set(id, {
      account: acc,
      paidTotal: (totalsByAccount.get(id)?.paidTotal || 0) + txn.amount,
    });
  }

  if (totalsByAccount.size === 0) {
    throw new AppError(
      'د دې پلور لپاره د نغدو پیسو بیرته ورکولو حساب ونه موندل شو. لومړی د پلور تادیه وګورئ.',
      404
    );
  }

  let best = null;
  for (const entry of totalsByAccount.values()) {
    if (entry.paidTotal >= cashRefundAmount) {
      if (!best || entry.paidTotal < best.paidTotal) best = entry;
    }
  }
  if (!best) {
    for (const entry of totalsByAccount.values()) {
      if (!best || entry.paidTotal > best.paidTotal) best = entry;
    }
  }

  return best.account;
};

/**
 * Apply or reverse ledger entries for a sale return.
 * Forward: reduce receivable by refundAmount; optional cash refund from payment account.
 */
const applySaleReturnAccounts = async ({
  session,
  sale,
  refundAmount,
  cashRefundAmount = 0,
  cashRefundAccountId = null,
  saleReturnId,
  userId,
  reverse = false,
}) => {
  const mult = reverse ? -1 : 1;
  const receivableAccount = await getReceivableAccount(session, sale);

  if (receivableAccount && refundAmount > 0) {
    const receivableDelta = mult * -refundAmount;

    await AccountTransaction.create(
      [
        {
          account: receivableAccount._id,
          transactionType: 'SaleReturn',
          amount: receivableDelta,
          referenceType: 'saleReturn',
          referenceId: saleReturnId,
          description: `د پلور بیرته راستنیدنه - بل ${sale.billNumber || 'N/A'}`,
          created_by: userId,
        },
      ],
      { session }
    );

    receivableAccount.currentBalance += receivableDelta;
    await receivableAccount.save({ session });
  }

  let usedCashAccountId = null;

  if (cashRefundAmount > 0) {
    const cashAccount = cashRefundAccountId
      ? await Account.findById(cashRefundAccountId).session(session)
      : await resolveCashRefundAccount(session, sale, cashRefundAmount);

    if (!cashAccount || cashAccount.isDeleted) {
      throw new AppError(
        'د دې پلور لپاره د نغدو پیسو بیرته ورکولو حساب ونه موندل شو',
        404
      );
    }

    if (!reverse && CASH_ACCOUNT_TYPES.has(cashAccount.type)) {
      if (cashAccount.currentBalance < cashRefundAmount) {
        throw new AppError(
          `ناکافي موجودي! په ${cashAccount.name} حساب کې موجودي: ${cashAccount.currentBalance.toLocaleString()} افغانۍ`,
          400
        );
      }
    }

    const cashDelta = mult * -cashRefundAmount;

    await AccountTransaction.create(
      [
        {
          account: cashAccount._id,
          transactionType: 'SaleReturn',
          amount: cashDelta,
          referenceType: 'saleReturn',
          referenceId: saleReturnId,
          description: `نغدي بیرته ورکول د پلور - بل ${sale.billNumber || 'N/A'}`,
          created_by: userId,
        },
      ],
      { session }
    );

    cashAccount.currentBalance += cashDelta;
    await cashAccount.save({ session });

    sale.paidAmount = Math.max(0, sale.paidAmount + cashDelta);
    usedCashAccountId = cashAccount._id;
  }

  return { cashRefundAccountId: usedCashAccountId };
};

const applySaleItemReturnDeduction = ({
  saleItem,
  quantity,
  refundAmount,
  baseQty,
}) => {
  const returnedCost = returnedCostForBaseQty(saleItem, baseQty);
  saleItem.quantity -= quantity;
  saleItem.totalPrice -= refundAmount;
  saleItem.profit -= refundAmount - returnedCost;

  if (saleItem.quantity <= 0) {
    saleItem.isDeleted = true;
    saleItem.quantity = 0;
    saleItem.totalPrice = 0;
    saleItem.profit = 0;
  }
};

const revertSaleItemReturnDeduction = ({
  saleItem,
  quantity,
  refundAmount,
  baseQty,
}) => {
  const returnedCost = returnedCostForBaseQty(saleItem, baseQty);
  const returnedProfit = refundAmount - returnedCost;

  saleItem.quantity += quantity;
  saleItem.totalPrice += refundAmount;
  saleItem.profit += returnedProfit;

  if (saleItem.isDeleted && saleItem.quantity > 0) {
    saleItem.isDeleted = false;
  }
};

const getPostedReceivableCredit = (saleReturn) =>
  saleReturn.receivableReduced ?? saleReturn.refundAmount ?? 0;

const assertNoActiveSaleReturns = async (session, saleId) => {
  let query = SaleReturn.countDocuments({
    sale: saleId,
    isDeleted: false,
  });
  if (session) query = query.session(session);
  const count = await query;

  if (count > 0) {
    throw new AppError(
      'دا پلور نشي حذف کیدای ځکه چې بیرته راستنیدنې ثبت شوې دي. بیرته راستنیدنې د معاملې اعتبار لپاره ثابت پاتې کیږي.',
      400
    );
  }
};

module.exports = {
  assertNoActiveSaleReturns,
  returnedCostForBaseQty,
  toBaseQty,
  sumActiveItemsSubtotal,
  computeLineRefundPreDiscount,
  computeEffectiveCustomerRefund,
  recalculateSaleTotalsFromItems,
  resolveReturnLineRefund,
  getSaleDueAmount,
  resolveReceivableReturnCredit,
  computeRequiredCashRefund,
  getPostedReceivableCredit,
  applySaleTotalsAfterReturn,
  getActiveSaleItems,
  resolveStoreReturnBatch,
  resolveEmployeeReturnBatch,
  getStockBatchMeta,
  resolveReturnStockBatches,
  mapRestoredBatchesForStorage,
  applyStoreReturnStock,
  reverseStoreReturnStock,
  reverseEmployeeReturnStock,
  incrementStoreStock,
  decrementStoreStock,
  incrementEmployeeStock,
  decrementEmployeeStock,
  assertReturnQuantityAllowed,
  assertRefundAmountAllowed,
  resolveCashRefundAccount,
  applySaleReturnAccounts,
  applySaleItemReturnDeduction,
  revertSaleItemReturnDeduction,
};
