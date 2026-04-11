const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Income category is required'],
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    description: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      trim: true,
      default: 'درآمد عمومی',
    },
    placedInAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indexes
incomeSchema.index({ category: 1, date: -1 });
incomeSchema.index({ source: 1 });
incomeSchema.index({ created_by: 1, date: -1 });

const Income = mongoose.model('Income', incomeSchema);

module.exports = Income;
