const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema(
  {
    purchase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Purchase',
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
    batchNumber: { type: String, trim: true, default: null },
    expiryDate: { type: Date, default: null },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true }, // cost per unit (carton, kg, etc.)
    totalPrice: { type: Number, required: true }, // quantity * unitPrice
    /** Base units reversed from receipt location on purchase soft-delete (for restore). */
    stockReversedBase: { type: Number, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

purchaseItemSchema.plugin(require('../plugins/softDeletePlugin'));

const PurchaseItem =
  mongoose.models.PurchaseItem ||
  mongoose.model('PurchaseItem', purchaseItemSchema);
module.exports = PurchaseItem;
