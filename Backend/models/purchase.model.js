const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema(
  {
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    // explicit reference to the supplier's accounting account
    supplierAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: false,
    },
    // snapshot of supplier name for audit and display
    supplierName: {
      type: String,
      required: false,
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    dueAmount: {
      type: Number,
      default: 0,
    },
    stockLocation: {
      type: String,
      enum: ['warehouse', 'store'],
      default: 'warehouse',
    },
    description: {
      type: String,
      maxlength: 500,
      required: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

purchaseSchema.plugin(require('../plugins/softDeletePlugin'));

// Avoid OverwriteModelError in hot-reload/watch environments
const Purchase =
  mongoose.models.Purchase || mongoose.model('Purchase', purchaseSchema);
module.exports = Purchase;
