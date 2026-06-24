const Account = require('../models/account.model');
const AccountTransaction = require('../models/accountTransaction.model');
const AppError = require('./AppError');

const DELETE_REVERSAL_DESC = {
  income: /^Reversal of income txn/i,
  expense: /^Reversal of expense txn/i,
};

async function findActivePosting(session, referenceType, referenceId) {
  const filter = {
    referenceType,
    referenceId,
    isDeleted: false,
    reversed: { $ne: true },
  };
  if (referenceType === 'income') {
    filter.amount = { $gt: 0 };
  } else if (referenceType === 'expense') {
    filter.amount = { $lt: 0 };
  }

  return AccountTransaction.findOne(filter)
    .sort({ createdAt: -1 })
    .session(session);
}

async function findLinkedTransactions(session, referenceType, referenceId, opts = {}) {
  const filter = {
    referenceType,
    referenceId,
    isDeleted: false,
  };
  if (opts.reversedOnly === true) filter.reversed = true;
  else if (opts.activeOnly === true) {
    filter.$or = [{ reversed: false }, { reversed: { $exists: false } }];
  }

  let q = AccountTransaction.find(filter).sort({ createdAt: -1 });
  if (session) q = q.session(session);
  return q;
}

/** Mark legacy delete-reversal rows so restore is not blocked (pre-fix data). */
async function neutralizeLegacyDeleteReversals(session, referenceType, referenceId, userId) {
  const pattern = DELETE_REVERSAL_DESC[referenceType];
  if (!pattern) return;

  await AccountTransaction.updateMany(
    {
      referenceType,
      referenceId,
      isDeleted: false,
      reversed: { $ne: true },
      description: { $regex: pattern },
    },
    {
      $set: {
        reversed: true,
        reversedAt: new Date(),
        reversedBy: userId,
      },
    },
    { session }
  );
}

async function undoLinkedAccountTransactions(session, referenceType, referenceId, userId) {
  await neutralizeLegacyDeleteReversals(session, referenceType, referenceId, userId);

  const posting = await findActivePosting(session, referenceType, referenceId);
  if (!posting) return 0;

  const acc = await Account.findById(posting.account).session(session);
  if (!acc || acc.isDeleted) {
    throw new AppError('د معاملې حساب ونه موندل شو', 404);
  }

  acc.currentBalance -= posting.amount;
  await acc.save({ session });

  posting.reversed = true;
  posting.reversedBy = userId;
  posting.reversedAt = new Date();
  await posting.save({ session });

  return 1;
}

async function redoLinkedAccountTransactions(session, referenceType, referenceId, userId) {
  await neutralizeLegacyDeleteReversals(session, referenceType, referenceId, userId);

  const txns = await findLinkedTransactions(session, referenceType, referenceId, {
    reversedOnly: true,
  });

  if (!txns.length) {
    throw new AppError(
      referenceType === 'income'
        ? 'د عاید لپاره حذف شوې حساب معامله ونه موندلې'
        : 'د لګښت لپاره حذف شوې حساب معامله ونه موندلې',
      400
    );
  }

  // Only re-activate txns reversed on delete (latest posting if several exist from edits)
  const toRestore = txns.filter((t) => {
    if (referenceType === 'income') return t.amount > 0;
    if (referenceType === 'expense') return t.amount < 0;
    return true;
  });
  const targets = toRestore.length ? [toRestore[0]] : [txns[0]];

  for (const txn of targets) {
    const acc = await Account.findById(txn.account).session(session);
    if (!acc || acc.isDeleted) {
      throw new AppError('د معاملې حساب ونه موندل شو', 404);
    }

    acc.currentBalance += txn.amount;
    await acc.save({ session });

    txn.reversed = false;
    txn.reversalTransaction = undefined;
    txn.reversedBy = undefined;
    txn.reversedAt = undefined;
    await txn.save({ session });
  }

  return targets.length;
}

/**
 * Edit: update the existing posting in place (balance delta), do not create a second row.
 */
async function updateLinkedAccountTransactionOnEdit(
  session,
  referenceType,
  referenceId,
  userId,
  { amount, accountId, date, description, transactionType }
) {
  await neutralizeLegacyDeleteReversals(session, referenceType, referenceId, userId);

  const newAmount =
    referenceType === 'income'
      ? Math.abs(Number(amount))
      : -Math.abs(Number(amount));

  const existingTxn = await findActivePosting(session, referenceType, referenceId);

  if (existingTxn) {
    const oldAmount = existingTxn.amount;
    const oldAccountId = existingTxn.account.toString();
    const newAccountStr = String(accountId);

    if (oldAccountId === newAccountStr) {
      const delta = newAmount - oldAmount;
      if (Math.abs(delta) > 0.0001) {
        await Account.findByIdAndUpdate(
          accountId,
          { $inc: { currentBalance: delta } },
          { session }
        );
      }
    } else {
      await Account.findByIdAndUpdate(
        oldAccountId,
        { $inc: { currentBalance: -oldAmount } },
        { session }
      );
      await Account.findByIdAndUpdate(
        accountId,
        { $inc: { currentBalance: newAmount } },
        { session }
      );
      existingTxn.account = accountId;
    }

    existingTxn.amount = newAmount;
    existingTxn.date = date || existingTxn.date;
    existingTxn.description = description;
    existingTxn.transactionType = transactionType;
    await existingTxn.save({ session });
    return existingTxn;
  }

  const acc = await Account.findById(accountId).session(session);
  if (!acc || acc.isDeleted) {
    throw new AppError('حساب ونه موندل شو', 404);
  }

  const created = await AccountTransaction.create(
    [
      {
        account: accountId,
        date: date || new Date(),
        transactionType,
        amount: newAmount,
        referenceType,
        referenceId,
        description,
        created_by: userId,
      },
    ],
    { session }
  );

  acc.currentBalance += newAmount;
  await acc.save({ session });
  return created[0];
}

module.exports = {
  undoLinkedAccountTransactions,
  redoLinkedAccountTransactions,
  neutralizeLegacyDeleteReversals,
  updateLinkedAccountTransactionOnEdit,
};
