const REVERSAL_DESCRIPTION_PREFIX = 'بیرته کول:';

const BLOCKED_REFERENCE_TYPES = new Set([
  'sale',
  'purchase',
  'expense',
  'income',
  'saleReturn',
  'purchaseReturn',
]);

function isReversalEntry(tx) {
  if (!tx) return false;
  if (tx.reversesTransaction) return true;
  const desc = tx.description || '';
  return desc.startsWith(REVERSAL_DESCRIPTION_PREFIX);
}

/** Mirror of Backend/utils/accountTransactionReverse.js — dashboard reverse eligibility */
export function canReverseAccountTransaction(tx) {
  if (!tx || tx.isDeleted) return false;
  if (tx.reversed === true) return false;
  if (isReversalEntry(tx)) return false;
  if (tx.referenceType && BLOCKED_REFERENCE_TYPES.has(tx.referenceType)) {
    return false;
  }
  if (tx.referenceType === 'transfer' && tx.transactionType === 'Transfer') {
    return true;
  }
  if (
    tx.referenceType === 'payment' &&
    (tx.transactionType === 'Debit' || tx.transactionType === 'Credit')
  ) {
    return true;
  }
  return false;
}

export function isAccountTransactionReversible(tx) {
  if (typeof tx?.canReverse === 'boolean') return tx.canReverse;
  return canReverseAccountTransaction(tx);
}
