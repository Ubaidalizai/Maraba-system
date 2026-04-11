const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
      unique: true,
      required: false, // Auto-generated, but can be overridden
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: false, // nullable for walk-in cash sales
    },
    // explicit reference to the customer's accounting account
    customerAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: false,
    },
    // snapshot of customer name for audit and display
    customerName: {
      type: String,
      required: false,
    },
    // Reference the employee's accounting Account
    employeeAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: false, // reference to employee's Account (ledger)
    },
    saleDate: {
      type: Date,
      default: Date.now,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    dueAmount: {
      type: Number,
      default: 0, // calculated: totalAmount - paidAmount
    },
    placedIn: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account', // Dakhal / Tajri / Saraf
      required: true,
    },
    invoiceType: {
      type: String,
      enum: ['small', 'large'],
      default: 'small',
    },
    soldBy: {
      // the cashier / user who created the sale
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Auto-generate bill number before saving
saleSchema.pre('save', async function (next) {
  // Only generate if billNumber is not provided
  if (!this.billNumber || this.billNumber.trim() === '') {
    try {
      // Get the total count of all sales to create a sequential number
      const query = {};
      
      // Exclude current document if this is an update
      if (!this.isNew) {
        query._id = { $ne: this._id };
      }
      
      const totalSalesCount = await mongoose.model('Sale').countDocuments(query);
      
      // Format: BILL-XXXXXX (e.g., BILL-000001, BILL-000002, etc.)
      // Sequential number that never resets, starting from 000001
      const sequence = String(totalSalesCount + 1).padStart(6, '0');
      this.billNumber = `BILL-${sequence}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model('Sale', saleSchema);
