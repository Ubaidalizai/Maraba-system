const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['supplier', 'customer', 'employee', 'cashier', 'safe', 'saraf'],
      required: true,
    },
    refId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null, // reference to Supplier / Customer / Employee if applicable
    },
    name: {
      type: String,
      required: [true, 'Account name is required'],
      trim: true,
    },
    openingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    currency: { type: String, default: 'AFN' }, // future flexibility
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One active account per type+refId
// Ensure uniqueness only for active accounts (allow soft-deleted duplicates)
accountSchema.index(
  { type: 1, refId: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false, refId: { $type: 'objectId' } },
  }
);

// For quick lookups by type or name
accountSchema.index({ type: 1 });
accountSchema.index({ name: 1 });

const Account = mongoose.model('Account', accountSchema);
module.exports = Account;
