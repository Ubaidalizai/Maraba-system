const mongoose = require('mongoose');

const purchaseReturnSchema = new mongoose.Schema(
  {
    purchase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Purchase',
      required: true,
    },
    purchaseItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseItem',
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
    batchNumber: { type: String, default: 'DEFAULT' },
    quantity: { type: Number, required: true, min: 0.000001 },
    creditAmount: { type: Number, required: true, min: 0 },
    cashRefundAmount: { type: Number, default: 0, min: 0 },
    cashRefundAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
    },
    lineCreditAmount: { type: Number, min: 0 },
    payableReduced: { type: Number, min: 0 },
    /** Stock quantity removed at return time (primary-unit qty for undo) */
    stockQtyRemoved: { type: Number, min: 0 },
    reason: { type: String },
    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

purchaseReturnSchema.index({ purchase: 1, isDeleted: 1 });
purchaseReturnSchema.index({ purchaseItem: 1, isDeleted: 1 });

purchaseReturnSchema.plugin(require('../plugins/softDeletePlugin'));

const PurchaseReturn =
  mongoose.models.PurchaseReturn ||
  mongoose.model('PurchaseReturn', purchaseReturnSchema);

module.exports = PurchaseReturn;
