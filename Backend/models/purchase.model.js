const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema(
  {
    purchaseNumber: {
      type: String,
      unique: true,
      required: false, // Auto-generated, but can be overridden
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    // explicit reference to the supplier's accounting account
    supplierAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: false,
    },
    // snapshot of supplier name for audit and display
    supplierName: {
      type: String,
      required: false,
    },
    purchaseDate: {
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
      default: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Auto-generate purchase number before saving
purchaseSchema.pre('save', async function (next) {
  // Only generate if purchaseNumber is not provided
  if (!this.purchaseNumber || this.purchaseNumber.trim() === '') {
    try {
      // Get the total count of all purchases to create a sequential number
      const query = {};
      
      // Exclude current document if this is an update
      if (!this.isNew) {
        query._id = { $ne: this._id };
      }
      
      const totalPurchasesCount = await mongoose.model('Purchase').countDocuments(query);
      
      // Format: PUR-XXXXXX (e.g., PUR-000001, PUR-000002, etc.)
      // Sequential number that never resets, starting from 000001
      const sequence = String(totalPurchasesCount + 1).padStart(6, '0');
      this.purchaseNumber = `PUR-${sequence}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Avoid OverwriteModelError in hot-reload/watch environments
const Purchase =
  mongoose.models.Purchase || mongoose.model('Purchase', purchaseSchema);
module.exports = Purchase;
