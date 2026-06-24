const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    baseUnit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Unit',
      required: true,
    },
    latestPurchasePrice: { type: Number, default: 0 }, // cost per base unit
    trackByBatch: { type: Boolean, default: false },
    /** Overrides settings.expiryNotifyDays when set (null = use global). */
    notifyDaysBefore: { type: Number, default: null, min: 0 },
    description: String,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

productSchema.plugin(require('../plugins/softDeletePlugin'));

module.exports = mongoose.model('Product', productSchema);
