const Joi = require('joi');
const mongoose = require('mongoose');
const objectId = (value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.message('Invalid ObjectId format');
  }
  return value;
};

exports.createPurchaseSchema = Joi.object({
  supplier: Joi.string().custom(objectId).optional(),
  supplierAccount: Joi.string().custom(objectId).optional(),
  purchaseDate: Joi.date().optional(),
  items: Joi.array()
    .items(
      Joi.object({
        product: Joi.string().required(),
        unit: Joi.string().required(),
        batchNumber: Joi.string().allow(null, '').optional(),
        expiryDate: Joi.date().allow(null, '').optional(),
        quantity: Joi.number().positive().required(),
        unitPrice: Joi.number().positive().required(),
      })
    )
    .min(1)
    .required(),
  paidAmount: Joi.number().min(0).default(0),
  paymentAccount: Joi.string().required(), // Cash / Safe / Saraf account ID
  stockLocation: Joi.string().valid('warehouse', 'store').default('warehouse'), // Where to add stock
});

// Require at least one of supplier or supplierAccount
exports.createPurchaseSchema = exports.createPurchaseSchema.or('supplier', 'supplierAccount');

// ✅ Validation for updating purchase
exports.updatePurchaseSchema = Joi.object({
  supplier: Joi.string().custom(objectId).optional(),
  supplierAccount: Joi.string().custom(objectId).optional(),
  purchaseDate: Joi.date().optional(),
  paidAmount: Joi.number().min(0).optional(),
  paymentAccount: Joi.string().custom(objectId).optional(), // Allow updating payment account
  stockLocation: Joi.string().valid('warehouse', 'store').optional(), // Allow updating stock location
  reason: Joi.string().max(200).optional(),

  items: Joi.array()
    .items(
      Joi.object({
        product: Joi.string().custom(objectId).required().messages({
          'any.required': 'Product ID is required for each item',
        }),
        unit: Joi.string().custom(objectId).required().messages({
          'any.required': 'Unit ID is required for each item',
        }),
        batchNumber: Joi.string().allow(null, '').optional(),
        expiryDate: Joi.date().allow(null, '').optional(),
        quantity: Joi.number().positive().precision(3).required().messages({
          'number.base': 'Quantity must be a number',
          'number.positive': 'Quantity must be greater than 0',
        }),
        unitPrice: Joi.number().positive().precision(2).required().messages({
          'number.base': 'Unit price must be a number',
          'number.positive': 'Unit price must be greater than 0',
        }),
      })
    )
    .optional()
    .messages({
      'array.base': 'Items must be an array of purchase items',
    }),
});
