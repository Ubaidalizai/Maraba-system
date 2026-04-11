const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema(
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
    batchNumber: {
      type: String,
      default: 'DEFAULT', // 👈 Virtual batch for non-batch items
    },
    purchasePricePerBaseUnit: {
      type: Number,
      required: true,
      min: 0,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    location: {
      type: String,
      enum: ['warehouse', 'store'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, 'Quantity cannot be negative'],
    },
    minLevel: {
      type: Number,
      default: 0,
      min: [0, 'Min level cannot be negative'],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// ✅ Ensure unique stock record per (product + batch + location)
stockSchema.index(
  { product: 1, batchNumber: 1, location: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

const Stock = mongoose.model('Stock', stockSchema);
module.exports = Stock;
