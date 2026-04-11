const Joi = require('joi');
const mongoose = require('mongoose');

// Sale item validation schema
const saleItemSchema = Joi.object({
  product: Joi.string()
    .custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .required()
    .messages({
      'any.invalid': 'Product ID must be a valid ObjectId',
      'any.required': 'Product is required',
    }),

  unit: Joi.string()
    .custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .required()
    .messages({
      'any.invalid': 'Unit ID must be a valid ObjectId',
      'any.required': 'Unit is required',
    }),

  batchNumber: Joi.string().trim().min(1).max(100).required().messages({
    'string.empty': 'Batch number is required',
    'string.min': 'Batch number must be at least 1 character long',
    'string.max': 'Batch number must not exceed 100 characters',
    'any.required': 'Batch number is required',
  }),

  quantity: Joi.number().positive().precision(6).required().messages({
    'number.positive': 'Quantity must be a positive number',
    'any.required': 'Quantity is required',
  }),
});

const objectId = (value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.message('Invalid ObjectId format');
  }
  return value;
};

const createSaleSchema = Joi.object({
  customer: Joi.string()
    .custom(objectId)
    .allow(null, '')
    .optional()
    .messages({ 'string.pattern.base': 'Invalid customer ID' }),

  employee: Joi.string()
    .custom(objectId)
    .allow(null, '')
    .optional()
    .messages({ 'string.pattern.base': 'Invalid employee ID' }),

  saleDate: Joi.date().optional(),

  placedIn: Joi.string().custom(objectId).required().messages({
    'any.required': 'Account (Dakhal / Tajri / Saraf) is required',
  }),

  invoiceType: Joi.string().valid('small', 'large').default('small'),

  paidAmount: Joi.number()
    .min(0)
    .required()
    .messages({ 'number.min': 'Paid amount must be 0 or greater' }),

  items: Joi.array()
    .items(
      Joi.object({
        product: Joi.string()
          .custom(objectId)
          .required()
          .messages({ 'any.required': 'Product ID is required' }),

        unit: Joi.string()
          .custom(objectId)
          .required()
          .messages({ 'any.required': 'Unit ID is required' }),

        quantity: Joi.number().positive().precision(3).required().messages({
          'number.base': 'Quantity must be a number',
          'number.positive': 'Quantity must be greater than 0',
        }),

        unitPrice: Joi.number().positive().precision(2).required().messages({
          'number.base': 'Unit price must be a number',
          'number.positive': 'Unit price must be greater than 0',
        }),

        cartonCount: Joi.number().integer().min(0).optional().allow(null).messages({
          'number.base': 'Carton count must be a number',
          'number.integer': 'Carton count must be an integer',
          'number.min': 'Carton count must be 0 or greater',
        }),
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one sale item is required',
      'array.base': 'Items must be an array of products',
    }),
});

const updateSaleSchema = Joi.object({
  customer: Joi.string()
    .custom(objectId)
    .allow(null, '')
    .optional()
    .messages({ 'string.pattern.base': 'Invalid customer ID' }),

  employee: Joi.string()
    .custom(objectId)
    .allow(null, '')
    .optional()
    .messages({ 'string.pattern.base': 'Invalid employee ID' }),

  saleDate: Joi.date().optional(),

  placedIn: Joi.string()
    .custom(objectId)
    .optional()
    .messages({ 'string.pattern.base': 'Invalid placedIn account ID' }),

  invoiceType: Joi.string().valid('small', 'large').optional(),

  paidAmount: Joi.number().min(0).optional(),

  reason: Joi.string().max(200).optional(),

  items: Joi.array()
    .items(
      Joi.object({
        product: Joi.string()
          .custom(objectId)
          .required()
          .messages({ 'any.required': 'Product ID is required' }),

        unit: Joi.string()
          .custom(objectId)
          .required()
          .messages({ 'any.required': 'Unit ID is required' }),

        quantity: Joi.number().positive().precision(3).required().messages({
          'number.base': 'Quantity must be a number',
          'number.positive': 'Quantity must be greater than 0',
        }),

        unitPrice: Joi.number().positive().precision(2).required().messages({
          'number.base': 'Unit price must be a number',
          'number.positive': 'Unit price must be greater than 0',
        }),

        cartonCount: Joi.number().integer().min(0).optional().allow(null).messages({
          'number.base': 'Carton count must be a number',
          'number.integer': 'Carton count must be an integer',
          'number.min': 'Carton count must be 0 or greater',
        }),
      })
    )
    .optional()
    .messages({
      'array.base': 'Items must be an array of sale items',
    }),
});

module.exports = {
  createSaleSchema,
  updateSaleSchema,
  saleItemSchema,
};
