const AppError = require('./AppError');
const Account = require('../models/account.model');
const AccountTransaction = require('../models/accountTransaction.model');
const Stock = require('../models/stock.model');
const Unit = require('../models/unit.model');
const PurchaseItem = require('../models/purchaseItem.model');
const PurchaseReturn = require('../models/purchaseReturn.model');

const CASH_ACCOUNT_TYPES = new Set(['cashier', 'safe', 'saraf']);

const {
  toStockQuantity,
  toMathBaseQuantity,
  primaryConversion,
  loadPrimaryUnitForProduct,
} = require('./primaryUnitStock');

const toBaseQty = (quantity, unit) => quantity * unit.conversion_to_base;

const sumActiveItemsTotal = (items) =>
  items
    .filter((i) => !i.isDeleted && (i.quantity || 0) > 0)
    .reduce((sum, i) => sum + (i.totalPrice || 0), 0);

const computeLineCreditAmount = (purchaseItem, quantity) => {
  const lineQty = purchaseItem.quantity || 0;
  if (lineQty <= 0 || quantity <= 0) return 0;
  return Math.round(((purchaseItem.totalPrice || 0) / lineQty) * quantity * 100) / 100;
};

const getPurchaseDueAmount = (purchase) =>
  Math.max(0, (purchase.totalAmount || 0) - (purchase.paidAmount || 0));

const recalculatePurchaseTotalsFromItems = (purchase, items) => {
  const totalAmount = sumActiveItemsTotal(items);
  const paid = Math.max(0, purchase.paidAmount || 0);

  return {
    totalAmount,
    dueAmount: Math.max(0, totalAmount - paid),
  };
};

const applyPurchaseTotalsAfterReturn = (purchase, activeItems) => {
  const previousTotal = purchase.totalAmount || 0;
  const totals = recalculatePurchaseTotalsFromItems(purchase, activeItems);
  Object.assign(purchase, totals);
  return {
    previousTotal,
    payableAdjustment: Math.max(0, previousTotal - totals.totalAmount),
  };
};

/** Cash supplier should return when purchase was partially paid (proportional to credit). */
const computeRequiredCashFromSupplier = (purchase, creditAmount) => {
  const paid = Math.max(0, purchase.paidAmount || 0);
  const total = Math.max(0, purchase.totalAmount || 0);
  const credit = Math.max(0, creditAmount || 0);
  if (paid <= 0 || credit <= 0 || total <= 0) return 0;
  return Math.round((paid * credit) / total * 100) / 100;
};

/**
 * Supplier payable credit on return — only reduces outstanding due.
 * Paid portions are reversed via cashRefundAmount from supplier, not payable.
 */
const resolvePayableReturnCredit = (purchase, payableAdjustment, creditAmount) => {
  const previousDue = getPurchaseDueAmount(purchase);
  const adjustment = Math.max(0, payableAdjustment || 0);
  const credit = Math.max(0, creditAmount ?? adjustment);
  const requiredCash = computeRequiredCashFromSupplier(purchase, credit);
  const dueRelief = Math.max(0, Math.min(adjustment, credit) - requiredCash);
  return Math.min(previousDue, dueRelief);
};

const getActivePurchaseItems = async (session, purchaseId) =>
  PurchaseItem.find({ purchase: purchaseId, isDeleted: { $ne: true } }).session(
    session
  );

const resolveReturnLineCredit = (purchaseReturn, purchaseItem) =>
  purchaseReturn.lineCreditAmount ??
  computeLineCreditAmount(purchaseItem, purchaseReturn.quantity) ??
  (purchaseItem.unitPrice || 0) * purchaseReturn.quantity;

const assertCreditAmountAllowed = (purchase, purchaseItem, quantity, creditAmount) => {
  const maxCredit = Math.min(
    computeLineCreditAmount(purchaseItem, quantity),
    purchase.totalAmount || 0
  );

  if (creditAmount > maxCredit + 0.01) {
    throw new AppError(
      `د بیرته راستنولو مبلغ (${creditAmount}) له اجازه شوي حد (${maxCredit}) څخه زیات دی.`,
      400
    );
  }
};

const resolvePurchaseReturnBatch = (purchaseItem, batchNumberFromRequest) => {
  let targetBatch = batchNumberFromRequest;
  if (!targetBatch) {
    const originalBatch = purchaseItem.batchNumber || 'DEFAULT';
    if (originalBatch === 'MULTI') {
      throw new AppError(
        'د څو بیچونو رانیول لپاره د بیرته راستنیدنې بیچ شمیره اړینه ده',
        400
      );
    }
    targetBatch = originalBatch;
  }
  return targetBatch || 'DEFAULT';
};

const assertPurchaseReturnQuantityAllowed = async ({
  session,
  purchase,
  purchaseItem,
  returnUnit,
  quantity,
  batchNumberFromRequest,
}) => {
  const itemUnit = await Unit.findById(purchaseItem.unit).session(session);
  if (!itemUnit) throw new AppError('د رانیول توکي واحد ونه موندل شو', 400);

  const primaryUnit = await loadPrimaryUnitForProduct(
    purchaseItem.product,
    session
  );
  const maxStock = toStockQuantity(
    purchaseItem.quantity,
    itemUnit,
    primaryUnit
  );
  const returnStock = toStockQuantity(quantity, returnUnit, primaryUnit);
  const returnBase = toMathBaseQuantity(quantity, returnUnit);

  if (returnStock > maxStock + 1e-9) {
    throw new AppError('ناسم بیرته راستنیدونکی مقدار', 400);
  }

  const batch = resolvePurchaseReturnBatch(purchaseItem, batchNumberFromRequest);
  const location = purchase.stockLocation || 'warehouse';

  const stock = await Stock.findOne({
    product: purchaseItem.product,
    batchNumber: batch,
    location,
    isDeleted: false,
  }).session(session);

  const available = stock?.quantity ?? 0;
  if (returnStock > available + 1e-9) {
    throw new AppError(
      `د دې بیچ لپاره ناکافي سټاک (${location}). موجود: ${available}, اړین: ${returnStock}`,
      400
    );
  }

  return returnBase;
};

const decrementStockAtLocation = async ({
  session,
  location,
  productId,
  batchNumber,
  stockQty,
  baseQty,
}) => {
  const qty = stockQty ?? baseQty;
  const stock = await Stock.findOne({
    product: productId,
    batchNumber: batchNumber || 'DEFAULT',
    location,
    isDeleted: false,
  }).session(session);

  if (!stock || stock.quantity + 1e-9 < qty) {
    throw new AppError('د دې بیچ لپاره ناکافي سټاک', 400);
  }

  stock.quantity -= qty;
  await stock.save({ session });
};

const incrementStockAtLocation = async ({
  session,
  location,
  productId,
  batchNumber,
  stockQty,
  baseQty,
}) => {
  const qty = stockQty ?? baseQty;
  const stock = await Stock.findOne({
    product: productId,
    batchNumber: batchNumber || 'DEFAULT',
    location,
    isDeleted: false,
  }).session(session);

  if (!stock) {
    throw new AppError('د سټاک بیرته راستنولو لپاره ریکارډ ونه موندل شو', 400);
  }

  stock.quantity += qty;
  await stock.save({ session });
};

const applyPurchaseReturnStock = async ({
  session,
  purchase,
  purchaseItem,
  stockQty,
  baseQty,
  batchNumberFromRequest,
}) => {
  const qty = stockQty ?? baseQty;
  const batchNumber = resolvePurchaseReturnBatch(
    purchaseItem,
    batchNumberFromRequest
  );
  const location = purchase.stockLocation || 'warehouse';

  await decrementStockAtLocation({
    session,
    location,
    productId: purchaseItem.product,
    batchNumber,
    stockQty: qty,
  });

  return batchNumber;
};

const reversePurchaseReturnStock = async ({
  session,
  purchase,
  purchaseItem,
  purchaseReturn,
  stockQty,
  baseQty,
}) => {
  if (!purchaseItem) {
    throw new AppError('د رانیول توکی د سټاک بیرته راستنولو لپاره ونه موندل شو', 404);
  }

  const qty =
    purchaseReturn?.stockQtyRemoved > 0
      ? purchaseReturn.stockQtyRemoved
      : stockQty ?? baseQty;
  const batchNumber =
    purchaseReturn?.batchNumber && purchaseReturn.batchNumber !== 'MULTI'
      ? purchaseReturn.batchNumber
      : resolvePurchaseReturnBatch(purchaseItem, null);
  const location = purchase.stockLocation || 'warehouse';

  await incrementStockAtLocation({
    session,
    location,
    productId: purchaseItem.product,
    batchNumber,
    stockQty: qty,
  });
};

const applyPurchaseItemReturnDeduction = ({
  purchaseItem,
  quantity,
  creditAmount,
}) => {
  purchaseItem.quantity -= quantity;
  purchaseItem.totalPrice -= creditAmount;

  if (purchaseItem.quantity <= 0) {
    purchaseItem.isDeleted = true;
    purchaseItem.quantity = 0;
    purchaseItem.totalPrice = 0;
  }
};

const revertPurchaseItemReturnDeduction = ({
  purchaseItem,
  quantity,
  creditAmount,
}) => {
  purchaseItem.quantity += quantity;
  purchaseItem.totalPrice += creditAmount;

  if (purchaseItem.isDeleted && purchaseItem.quantity > 0) {
    purchaseItem.isDeleted = false;
  }
};

const getSupplierAccount = async (session, purchase) => {
  if (purchase.supplierAccount) {
    const acc = await Account.findById(purchase.supplierAccount).session(session);
    if (acc && !acc.isDeleted) return acc;
  }

  return Account.findOne({
    refId: purchase.supplier,
    type: 'supplier',
    isDeleted: false,
  }).session(session);
};

const resolveCashReceiptAccount = async (session, purchase, cashAmount) => {
  const paymentTxns = await AccountTransaction.find({
    referenceType: 'purchase',
    referenceId: purchase._id,
    transactionType: 'Payment',
    amount: { $lt: 0 },
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
      paidTotal: (totalsByAccount.get(id)?.paidTotal || 0) + Math.abs(txn.amount),
    });
  }

  if (totalsByAccount.size === 0) {
    throw new AppError(
      'د دې رانیول لپاره د نغدو پیسو ترلاسه کولو حساب ونه موندل شو. لومړی د رانیول تادیه وګورئ.',
      404
    );
  }

  let best = null;
  for (const entry of totalsByAccount.values()) {
    if (entry.paidTotal >= cashAmount) {
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

const applyPurchaseReturnAccounts = async ({
  session,
  purchase,
  payableReduced,
  cashRefundAmount = 0,
  cashRefundAccountId = null,
  purchaseReturnId,
  userId,
  reverse = false,
}) => {
  const mult = reverse ? -1 : 1;
  const supplierAccount = await getSupplierAccount(session, purchase);

  if (supplierAccount && payableReduced > 0) {
    const payableDelta = mult * -payableReduced;

    await AccountTransaction.create(
      [
        {
          account: supplierAccount._id,
          transactionType: 'PurchaseReturn',
          amount: payableDelta,
          referenceType: 'purchaseReturn',
          referenceId: purchaseReturnId,
          description: 'د رانیول بیرته راستنیدنه',
          created_by: userId,
        },
      ],
      { session }
    );

    supplierAccount.currentBalance += payableDelta;
    await supplierAccount.save({ session });
  }

  let usedCashAccountId = null;

  if (cashRefundAmount > 0) {
    const cashAccount = cashRefundAccountId
      ? await Account.findById(cashRefundAccountId).session(session)
      : await resolveCashReceiptAccount(session, purchase, cashRefundAmount);

    if (!cashAccount || cashAccount.isDeleted) {
      throw new AppError(
        'د دې رانیول لپاره د نغدو پیسو ترلاسه کولو حساب ونه موندل شو',
        404
      );
    }

    const cashDelta = mult * cashRefundAmount;

    await AccountTransaction.create(
      [
        {
          account: cashAccount._id,
          transactionType: 'PurchaseReturn',
          amount: cashDelta,
          referenceType: 'purchaseReturn',
          referenceId: purchaseReturnId,
          description: 'نغدي ترلاسه کول د رانیول بیرته راستنیدنې',
          created_by: userId,
        },
      ],
      { session }
    );

    cashAccount.currentBalance += cashDelta;
    await cashAccount.save({ session });

    purchase.paidAmount = Math.max(0, purchase.paidAmount - mult * cashRefundAmount);
    usedCashAccountId = cashAccount._id;
  }

  return { cashRefundAccountId: usedCashAccountId };
};

/** Due-only portion of a return credit (excludes cash received from supplier). */
const resolveDueOnlyPayableCredit = (purchaseReturn) => {
  const cash = Math.max(0, purchaseReturn.cashRefundAmount || 0);
  const credit = Math.max(0, purchaseReturn.creditAmount || 0);
  return Math.max(0, credit - cash);
};

/** Posted supplier payable credit — reconcile with cash split for legacy rows. */
const getPostedPayableCredit = (purchaseReturn) => {
  const dueOnly = resolveDueOnlyPayableCredit(purchaseReturn);
  if (purchaseReturn.payableReduced != null) {
    return Math.min(purchaseReturn.payableReduced, dueOnly);
  }
  return dueOnly;
};

/** Undo ledger entries posted for a purchase return (exact amounts from DB). */
const reversePostedPurchaseReturnAccounts = async ({
  session,
  purchase,
  purchaseReturn,
  purchaseReturnId,
  userId,
}) => {
  const txns = await AccountTransaction.find({
    referenceType: 'purchaseReturn',
    referenceId: purchaseReturnId,
    isDeleted: { $ne: true },
  }).session(session);

  if (!txns.length) {
    if (!purchaseReturn) return;
    await applyPurchaseReturnAccounts({
      session,
      purchase,
      payableReduced: getPostedPayableCredit(purchaseReturn),
      cashRefundAmount: purchaseReturn.cashRefundAmount || 0,
      cashRefundAccountId: purchaseReturn.cashRefundAccount,
      purchaseReturnId,
      userId,
      reverse: true,
    });
    return;
  }

  let cashReceivedOnReturn = 0;

  for (const txn of txns) {
    const account = await Account.findById(txn.account).session(session);
    if (!account || account.isDeleted) {
      throw new AppError('د رانیول بیرته راستنیدنې په معامله کې حساب ونه موندل شو', 404);
    }

    const reversalAmount = -txn.amount;

    await AccountTransaction.create(
      [
        {
          account: account._id,
          transactionType: 'PurchaseReturn',
          amount: reversalAmount,
          referenceType: 'purchaseReturn',
          referenceId: purchaseReturnId,
          description: `${txn.description || 'د رانیول بیرته راستنیدنه'} (لغوه)`,
          created_by: userId,
        },
      ],
      { session }
    );

    account.currentBalance += reversalAmount;
    await account.save({ session });

    if (txn.amount > 0 && CASH_ACCOUNT_TYPES.has(account.type)) {
      cashReceivedOnReturn += txn.amount;
    }
  }

  if (cashReceivedOnReturn > 0) {
    purchase.paidAmount = Math.max(
      0,
      (purchase.paidAmount || 0) + cashReceivedOnReturn
    );
  }
};

const assertNoActivePurchaseReturns = async (session, purchaseId) => {
  let query = PurchaseReturn.countDocuments({
    purchase: purchaseId,
    isDeleted: false,
  });
  if (session) query = query.session(session);
  const count = await query;

  if (count > 0) {
    throw new AppError(
      'دا رانیول نشي حذف کیدای ځکه چې بیرته راستنیدنې ثبت شوې دي. بیرته راستنیدنې د معاملې اعتبار لپاره ثابت پاتې کیږي.',
      400
    );
  }
};

module.exports = {
  assertNoActivePurchaseReturns,
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
  getPostedPayableCredit,
  resolveDueOnlyPayableCredit,
  resolvePurchaseReturnBatch,
};
