const mongoose = require('mongoose');

const accountTransactionSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    transactionType: {
      type: String,
      enum: [
        'Sale',
        'Purchase',
        'Payment',
        'Transfer',
        'Expense',
        'Credit',
        'Debit',
        'SaleReturn',
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      // positive = credit, negative = debit
    },
    referenceType: {
      type: String,
      enum: ['sale', 'purchase', 'transfer', 'expense', 'income', 'saleReturn'],
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    description: {
      type: String,
      trim: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isDeleted: { type: Boolean, default: false },
    // reversal metadata
    reversed: { type: Boolean, default: false },
    reversalTransaction: { type: mongoose.Schema.Types.ObjectId },
    reversedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reversedAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes
accountTransactionSchema.index({ account: 1, date: -1 });
accountTransactionSchema.index({ referenceType: 1, referenceId: 1 });

const AccountTransaction = mongoose.model(
  'AccountTransaction',
  accountTransactionSchema
);

module.exports = AccountTransaction;
