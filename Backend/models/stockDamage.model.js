const mongoose = require('mongoose');

const stockDamageItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    unit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Unit',
      required: true,
    },
    batchNumber: { type: String, default: 'DEFAULT' },
    quantity: { type: Number, required: true, min: 0.000001 },
    baseQuantity: { type: Number, required: true, min: 0.000001 },
    costPerBaseUnit: { type: Number, required: true, min: 0 },
    lineLossAmount: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true },
  },
  { _id: true }
);

const stockDamageSchema = new mongoose.Schema(
  {
    damageDate: { type: Date, default: Date.now, required: true },
    location: {
      type: String,
      enum: ['warehouse', 'store', 'employee'],
      required: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    damageType: {
      type: String,
      enum: ['broken', 'expired', 'spoiled', 'theft', 'other'],
      default: 'other',
    },
    description: { type: String, trim: true, maxlength: 500 },
    totalLossAmount: { type: Number, default: 0, min: 0 },
    items: {
      type: [stockDamageItemSchema],
      validate: [(v) => Array.isArray(v) && v.length > 0, 'At least one item'],
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

stockDamageSchema.index({ damageDate: -1, isDeleted: 1 });
stockDamageSchema.index({ location: 1, isDeleted: 1 });

const StockDamage = mongoose.model('StockDamage', stockDamageSchema);

module.exports = StockDamage;
