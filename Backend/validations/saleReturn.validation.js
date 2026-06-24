const Joi = require('joi');
const mongoose = require('mongoose');

const objectId = (value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.message('Invalid ObjectId format');
  }
  return value;
};

const createSaleReturnSchema = Joi.object({
  saleId: Joi.string().custom(objectId).required().messages({
    'any.required': 'Sale ID is required',
  }),
  productId: Joi.string().custom(objectId).required().messages({
    'any.required': 'Product ID is required',
  }),
  unitId: Joi.string().custom(objectId).required().messages({
    'any.required': 'Unit ID is required',
  }),
  quantity: Joi.number().positive().precision(6).required().messages({
    'number.positive': 'Quantity must be greater than 0',
    'any.required': 'Quantity is required',
  }),
  refundAmount: Joi.number().min(0).precision(2).required().messages({
    'number.min': 'Refund amount cannot be negative',
    'any.required': 'Refund amount is required',
  }),
  cashRefundAmount: Joi.number().min(0).precision(2).optional().default(0),
  batchNumber: Joi.string().trim().min(1).max(100).optional().allow(null, ''),
  reason: Joi.string().max(500).optional().allow('', null),
});

const updateSaleReturnSchema = Joi.object({
  quantity: Joi.number().positive().precision(6).optional(),
  refundAmount: Joi.number().min(0).precision(2).optional(),
  cashRefundAmount: Joi.number().min(0).precision(2).optional(),
  batchNumber: Joi.string().trim().min(1).max(100).optional().allow(null, ''),
  unitId: Joi.string().custom(objectId).optional(),
  reason: Joi.string().max(500).optional().allow('', null),
}).min(1);

module.exports = {
  createSaleReturnSchema,
  updateSaleReturnSchema,
};
