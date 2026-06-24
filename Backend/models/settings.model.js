const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
    },
    companyNameEnglish: {
      type: String,
      trim: true,
    },
    logo: {
      type: String,
      default: null,
    },
    address: {
      type: String,
      trim: true,
    },
    phone1: {
      type: String,
      trim: true,
    },
    phone2: {
      type: String,
      trim: true,
    },
    phone3: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    website: {
      type: String,
      trim: true,
    },
    taxId: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    /** Default days-before-expiry alert window (global). */
    expiryNotifyDays: {
      type: Number,
      default: 14,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Settings = mongoose.model("Settings", settingsSchema);

module.exports = Settings;
