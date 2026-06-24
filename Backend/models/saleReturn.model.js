const mongoose = require('mongoose');

const saleReturnSchema = new mongoose.Schema(
  {
    sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
    batchNumber: { type: String, default: 'DEFAULT' },
    quantity: { type: Number, required: true, min: 0.000001 },
    refundAmount: { type: Number, required: true, min: 0 },
    cashRefundAmount: { type: Number, default: 0, min: 0 },
    cashRefundAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
    },
    /** Pre-discount line value removed (for item/subtotal recalc) */
    lineRefundAmount: { type: Number, min: 0 },
    /** Actual receivable account credit (capped to due before return) */
    receivableReduced: { type: Number, min: 0 },
    /** Exact store/employee batches restored on return (for precise undo on delete) */
    stockRestoredBatches: [
      {
        batchNumber: { type: String, default: 'DEFAULT' },
        quantityUsed: { type: Number, min: 0 },
      },
    ],
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

saleReturnSchema.index({ sale: 1, isDeleted: 1 });
saleReturnSchema.index({ sale: 1, product: 1, isDeleted: 1 });

saleReturnSchema.plugin(require('../plugins/softDeletePlugin'));

const SaleReturn = mongoose.model('SaleReturn', saleReturnSchema);

module.exports = SaleReturn;
