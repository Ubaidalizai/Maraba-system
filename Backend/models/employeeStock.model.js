const mongoose = require('mongoose');

const employeeStockSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity_in_hand: {
      type: Number,
      required: true,
      min: 0,
    },
    purchasePricePerBaseUnit: {
      type: Number,
      default: 0,
      min: 0,
    },
    batchNumber: {
      type: String,
      default: 'DEFAULT',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Ensure unique stock record per employee + product + batchNumber
employeeStockSchema.index({ employee: 1, product: 1, batchNumber: 1 }, { unique: true });

const EmployeeStock = mongoose.model('EmployeeStock', employeeStockSchema);

module.exports = EmployeeStock;
