const Joi = require('joi');
const mongoose = require('mongoose');

const objectId = (value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.message('Invalid ObjectId format');
  }
  return value;
};

const createPurchaseReturnSchema = Joi.object({
  purchaseId: Joi.string().custom(objectId).required().messages({
    'any.required': 'Purchase ID is required',
  }),
  purchaseItemId: Joi.string().custom(objectId).required().messages({
    'any.required': 'Purchase item ID is required',
  }),
  unitId: Joi.string().custom(objectId).required().messages({
    'any.required': 'Unit ID is required',
  }),
  quantity: Joi.number().positive().precision(6).required().messages({
    'number.positive': 'Quantity must be greater than 0',
    'any.required': 'Quantity is required',
  }),
  creditAmount: Joi.number().min(0).precision(2).required().messages({
    'number.min': 'Credit amount cannot be negative',
    'any.required': 'Credit amount is required',
  }),
  cashRefundAmount: Joi.number().min(0).precision(2).optional().default(0),
  batchNumber: Joi.string().trim().min(1).max(100).optional().allow(null, ''),
  reason: Joi.string().max(500).optional().allow('', null),
});

module.exports = {
  createPurchaseReturnSchema,
};
