const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Unit name is required'],
      trim: true,
    },
    description: String,
    conversion_to_base: {
      type: Number,
      required: [true, 'Conversion to base unit is required'],
      min: [0.0001, 'Conversion factor must be greater than 0'],
      default: 1, // Base unit has conversion factor of 1
    },
    base_unit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Unit',
      required: function() {
        return !this.is_base_unit;
      }
    },
    is_base_unit: {
      type: Boolean,
      default: false,
    },
    unit_type: {
      type: String,
      enum: ['weight', 'count', 'volume', 'length'],
      required: [true, 'Unit type is required']
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Validation: base_unit should reference another unit that is_base_unit = true
unitSchema.pre('save', async function(next) {
  if (!this.is_base_unit && this.base_unit) {
    const baseUnit = await this.constructor.findById(this.base_unit);
    if (!baseUnit || !baseUnit.is_base_unit) {
      throw new Error('base_unit must reference a valid base unit');
    }
  }
  next();
});

const Unit = mongoose.model('Unit', unitSchema);

module.exports = Unit;
