const mongoose = require('mongoose');

const sarafSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Saraf name is required'],
      trim: true,
    },
    contact_info: {
      phone: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
      },
      address: {
        type: String,
        trim: true,
      },
      city: {
        type: String,
        trim: true,
      },
      state: {
        type: String,
        trim: true,
      },
      zip_code: {
        type: String,
        trim: true,
      },
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Saraf = mongoose.model('Saraf', sarafSchema);

module.exports = Saraf;
