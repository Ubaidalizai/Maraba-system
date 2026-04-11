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
    batchNumber: { type: String, default: null },
    quantity: { type: Number, required: true },
    refundAmount: { type: Number, required: true },
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

const SaleReturn = mongoose.model('SaleReturn', saleReturnSchema);

module.exports = SaleReturn;
