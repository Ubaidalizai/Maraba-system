const mongoose = require('mongoose');

const stockTransferSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    fromLocation: {
      type: String,
      enum: ['warehouse', 'store', 'employee'],
      required: true,
    },
    toLocation: {
      type: String,
      enum: ['warehouse', 'store', 'employee'],
      required: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: function () {
        return (
          this.fromLocation === 'employee' || this.toLocation === 'employee'
        );
      },
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Unit',
      required: true,
    },
    transferDate: {
      type: Date,
      default: Date.now,
    },
    transferredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StockTransfer', stockTransferSchema);
