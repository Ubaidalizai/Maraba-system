const Account = require('../models/account.model');

/**
 * Ensure an Account exists for the given entity reference and type.
 * If not, create one. Returns the Account document.
 * Accepts a mongoose session to participate in transactions.
 */
async function getOrCreateAccount({ refId, type, name = '', session = null }) {
  const query = { refId, type, isDeleted: false };
  let account = null;
  if (session) {
    account = await Account.findOne(query).session(session);
  } else {
    account = await Account.findOne(query);
  }

  if (account) return account;

  const payload = {
    refId,
    type,
    name: name || String(refId),
    currentBalance: 0,
  };

  const created = await Account.create([payload], session ? { session } : undefined);
  // Account.create with array returns array in mongoose; created[0] is the doc
  return created[0];
}

module.exports = { getOrCreateAccount };
