const Account = require('../models/account.model');
const AccountTransaction = require('../models/accountTransaction.model');
const AppError = require('./AppError');

/**
 * Find account transactions linked to a purchase.
 * @param {boolean|null} deletedOnly - true = trash, false = active, null = all
 */
async function findPurchaseTransactions(session, purchaseId, deletedOnly) {
  const filter = {
    referenceType: 'purchase',
    referenceId: purchaseId,
  };
  if (deletedOnly === true) filter.isDeleted = true;
  else if (deletedOnly === false) filter.isDeleted = false;

  return AccountTransaction.find(filter)
    .sort({ createdAt: 1 })
    .session(session);
}

/**
 * Reverse purchase ledger on soft-delete (mirror of createPurchase postings).
 * Subtracts each txn.amount from its account and marks txns deleted.
 */
async function undoPurchaseAccountTransactions(session, purchaseId) {
  const txns = await findPurchaseTransactions(session, purchaseId, false);

  for (const txn of txns) {
    const acc = await Account.findById(txn.account).session(session);
    if (!acc) {
      throw new AppError('د رانیول په معامله کې حساب ونه موندل شو', 404);
    }
    if (acc.isDeleted) {
      throw new AppError('د رانیول په معامله کې حساب حذف شوی دی', 400);
    }

    acc.currentBalance -= txn.amount;
    await acc.save({ session });

    txn.isDeleted = true;
    await txn.save({ session });
  }

  return txns.length;
}

function purchaseExpectsLedgerEntries(purchase) {
  return Boolean(
    purchase?.supplier ||
      purchase?.supplierAccount ||
      (Number(purchase?.totalAmount) || 0) > 0
  );
}

/**
 * Re-apply purchase ledger when restoring from trash (exact inverse of undo).
 * Adds each txn.amount back and reactivates the original transactions.
 */
async function redoPurchaseAccountTransactions(session, purchaseId, purchase) {
  const txns = await findPurchaseTransactions(session, purchaseId, true);

  if (!txns.length) {
    if (purchaseExpectsLedgerEntries(purchase)) {
      throw new AppError(
        'د رانیول لپاره حذف شوې حساب معاملې ونه موندلې — حسابونه بیرته نشي تنظیم کیدای',
        400
      );
    }
    return 0;
  }

  for (const txn of txns) {
    const acc = await Account.findById(txn.account).session(session);
    if (!acc) {
      throw new AppError('د رانیول په معامله کې حساب ونه موندل شو', 404);
    }
    if (acc.isDeleted) {
      throw new AppError('د رانیول په معامله کې حساب حذف شوی دی', 400);
    }

    acc.currentBalance += txn.amount;
    await acc.save({ session });

    txn.isDeleted = false;
    await txn.save({ session });
  }

  return txns.length;
}

module.exports = {
  findPurchaseTransactions,
  undoPurchaseAccountTransactions,
  redoPurchaseAccountTransactions,
};
