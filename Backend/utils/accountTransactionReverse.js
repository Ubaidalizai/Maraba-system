const AccountTransaction = require('../models/accountTransaction.model');
const AppError = require('./AppError');

const REVERSAL_DESCRIPTION_PREFIX = 'بیرته کول:';

const BLOCKED_REFERENCE_TYPES = new Set([
  'sale',
  'purchase',
  'expense',
  'income',
  'saleReturn',
  'purchaseReturn',
]);

const PAIRABLE_REFERENCE_TYPES = new Set(['transfer', 'payment']);

function isReversalEntry(tx) {
  if (!tx) return false;
  if (tx.reversesTransaction) return true;
  const desc = tx.description || '';
  return desc.startsWith(REVERSAL_DESCRIPTION_PREFIX);
}

/**
 * Whether a transaction may be reversed from the dashboard (transfer / direct payment only).
 */
function canReverseAccountTransaction(tx) {
  if (!tx || tx.isDeleted) {
    return { allowed: false, reason: 'معامله ونه موندل شوه' };
  }
  if (tx.reversed === true) {
    return { allowed: false, reason: 'معامله دمخه بیرته شوې ده' };
  }
  if (isReversalEntry(tx)) {
    return { allowed: false, reason: 'د بیرته کولو معامله نشي بیا بیرته کیدای' };
  }
  if (tx.referenceType && BLOCKED_REFERENCE_TYPES.has(tx.referenceType)) {
    return {
      allowed: false,
      reason:
        'دا معامله دلته نشي بیرته کیدای — اصلي ریکارډ (پلور، رانیول، لګښت، عاید…) له خپلې پاڼې یا له زبالې څخه حذف/بیرته راستن کړئ',
    };
  }

  if (
    tx.referenceType === 'transfer' &&
    tx.transactionType === 'Transfer'
  ) {
    return { allowed: true };
  }

  if (
    tx.referenceType === 'payment' &&
    (tx.transactionType === 'Debit' || tx.transactionType === 'Credit')
  ) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason:
      'یوازې د سیسټم حسابونو انتقال یا مستقیم تادیه (پیرودونکی/عرضه کوونکی/کارمند) دلته بیرته کیدای شي',
  };
}

function assertCanReverseTransaction(tx) {
  const { allowed, reason } = canReverseAccountTransaction(tx);
  if (!allowed) {
    throw new AppError(reason || 'دا معامله نشي بیرته کیدای', 400);
  }
}

/**
 * Find the other leg of a transfer or direct payment (same referenceId).
 */
async function findPairedTransaction(session, orig) {
  if (
    orig.referenceId &&
    PAIRABLE_REFERENCE_TYPES.has(orig.referenceType)
  ) {
    return AccountTransaction.findOne({
      _id: { $ne: orig._id },
      referenceType: orig.referenceType,
      referenceId: orig.referenceId,
      isDeleted: false,
      reversed: { $ne: true },
    }).session(session);
  }

  // Legacy transfers without referenceId
  if (orig.transactionType === 'Transfer') {
    return AccountTransaction.findOne({
      _id: { $ne: orig._id },
      transactionType: 'Transfer',
      isDeleted: false,
      reversed: { $ne: true },
      created_by: orig.created_by,
      amount: { $eq: -orig.amount },
    })
      .sort({ createdAt: 1 })
      .session(session);
  }

  return null;
}

async function collectTransactionsToReverse(session, orig) {
  assertCanReverseTransaction(orig);

  const transactionsToReverse = [orig];
  const paired = await findPairedTransaction(session, orig);

  if (paired) {
    if (paired.reversed === true) {
      throw new AppError(
        'د دې معاملې بله لمن دمخه بیرته شوې ده — حسابونه سم نه دي',
        400
      );
    }
    transactionsToReverse.push(paired);
  }

  return transactionsToReverse;
}

module.exports = {
  REVERSAL_DESCRIPTION_PREFIX,
  isReversalEntry,
  canReverseAccountTransaction,
  assertCanReverseTransaction,
  findPairedTransaction,
  collectTransactionsToReverse,
};
