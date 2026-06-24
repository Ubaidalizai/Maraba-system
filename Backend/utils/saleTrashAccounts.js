const Account = require('../models/account.model');
const AccountTransaction = require('../models/accountTransaction.model');
const AppError = require('./AppError');

/**
 * Find account transactions linked to a sale.
 * @param {boolean|null} deletedOnly - true = trash, false = active, null = all
 */
async function findSaleTransactions(session, saleId, deletedOnly) {
  const filter = {
    referenceType: 'sale',
    referenceId: saleId,
  };
  if (deletedOnly === true) filter.isDeleted = true;
  else if (deletedOnly === false) filter.isDeleted = false;

  return AccountTransaction.find(filter)
    .sort({ createdAt: 1 })
    .session(session);
}

/**
 * Reverse sale ledger on soft-delete (mirror of createSale postings).
 * Subtracts each txn.amount from its account and marks txns deleted.
 */
async function undoSaleAccountTransactions(session, saleId) {
  const txns = await findSaleTransactions(session, saleId, false);

  for (const txn of txns) {
    const acc = await Account.findById(txn.account).session(session);
    if (!acc) {
      throw new AppError('د پلور په معامله کې حساب ونه موندل شو', 404);
    }
    if (acc.isDeleted) {
      throw new AppError('د پلور په معامله کې حساب حذف شوی دی', 400);
    }

    acc.currentBalance -= txn.amount;
    await acc.save({ session });

    txn.isDeleted = true;
    await txn.save({ session });
  }

  return txns.length;
}

function saleExpectsLedgerEntries(sale) {
  return Boolean(
    sale?.customer ||
      sale?.employee ||
      sale?.customerAccount ||
      sale?.employeeAccount ||
      (Number(sale?.paidAmount) || 0) > 0
  );
}

/**
 * Re-apply sale ledger when restoring from trash (exact inverse of undo).
 * Adds each txn.amount back and reactivates the original transactions.
 */
async function redoSaleAccountTransactions(session, saleId, sale) {
  const txns = await findSaleTransactions(session, saleId, true);

  if (!txns.length) {
    if (saleExpectsLedgerEntries(sale)) {
      throw new AppError(
        'د پلور لپاره حذف شوې حساب معاملې ونه موندلې — حسابونه بیرته نشي تنظیم کیدای',
        400
      );
    }
    return 0;
  }

  for (const txn of txns) {
    const acc = await Account.findById(txn.account).session(session);
    if (!acc) {
      throw new AppError('د پلور په معامله کې حساب ونه موندل شو', 404);
    }
    if (acc.isDeleted) {
      throw new AppError('د پلور په معامله کې حساب حذف شوی دی', 400);
    }

    acc.currentBalance += txn.amount;
    await acc.save({ session });

    txn.isDeleted = false;
    await txn.save({ session });
  }

  return txns.length;
}

module.exports = {
  findSaleTransactions,
  undoSaleAccountTransactions,
  redoSaleAccountTransactions,
};
