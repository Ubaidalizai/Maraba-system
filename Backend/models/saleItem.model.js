const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema(
  {
    sale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale',
      required: true,
      index: true,
    },
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
      trim: true,
      default: null,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0, // Allow 0 for fully returned items
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    profit: {
      type: Number,
      default: 0, // calculated based on latestPurchasePrice * conversion
    },
    costPricePerUnit: {
      type: Number,
      default: 0,
    },
    batchesUsed: {
      type: [
        {
          batchNumber: String,
          quantityUsed: Number,
          costPerUnit: Number,
        },
      ],
      default: [],
    },
    cartonCount: {
      type: Number,
      required: false,
      min: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Prevent OverwriteModelError when using hot-reload (nodemon) or when models are required multiple times
const SaleItem =
  mongoose.models.SaleItem || mongoose.model('SaleItem', saleItemSchema);
module.exports = SaleItem;
