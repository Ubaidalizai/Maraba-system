const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['expense', 'income', 'both'],
      required: [true, 'Category type is required'],
      default: 'both',
    },
    description: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      default: '#3B82F6', // Default blue color
      match: [/^#[0-9A-F]{6}$/i, 'Please enter a valid hex color'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    created_by: {
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

// Indexes
// Partial unique index - only unique for non-deleted categories
categorySchema.index(
  { name: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  }
);
categorySchema.index({ isActive: 1, isDeleted: 1 });

// Virtual for usage count (can be populated when needed)
categorySchema.virtual('usageCount', {
  ref: 'Expense',
  localField: '_id',
  foreignField: 'category',
  count: true,
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
