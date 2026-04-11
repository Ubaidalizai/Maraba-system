const Joi = require('joi');

// Stock creation validation schema
const stockValidationSchema = Joi.object({
  product: Joi.string().hex().length(24).required().messages({
    'string.base': `"product" should be a type of 'text'`,
    'string.hex': `"product" must be a valid MongoDB ObjectId`,
    'string.length': `"product" must be exactly 24 characters long`,
    'any.required': `"product" is a required field`,
  }),
  batchNumber: Joi.string().min(1).max(100).required().messages({
    'string.base': `"batchNumber" should be a type of 'text'`,
    'string.empty': `"batchNumber" cannot be an empty field`,
    'string.min': `"batchNumber" should have a minimum length of {#limit}`,
    'string.max': `"batchNumber" should have a maximum length of {#limit}`,
    'any.required': `"batchNumber" is a required field`,
  }),
  expiry_date: Joi.date().greater('now').allow(null, '').optional().messages({
    'date.base': `"expiry_date" should be a valid date`,
    'date.greater': `"expiry_date" must be a future date`,
  }),
  location: Joi.string().valid('Inventory', 'Pharmacy').required().messages({
    'string.base': `"location" should be a type of 'text'`,
    'any.only': `"location" must be either 'Inventory' or 'Pharmacy'`,
    'any.required': `"location" is a required field`,
  }),
  quantity: Joi.number().min(0).required().messages({
    'number.base': `"quantity" should be a type of 'number'`,
    'number.min': `"quantity" cannot be negative`,
    'any.required': `"quantity" is a required field`,
  }),
  unit: Joi.string().min(1).max(50).required().messages({
    'string.base': `"unit" should be a type of 'text'`,
    'string.empty': `"unit" cannot be an empty field`,
    'string.min': `"unit" should have a minimum length of {#limit}`,
    'string.max': `"unit" should have a maximum length of {#limit}`,
    'any.required': `"unit" is a required field`,
  }),
  conversion_to_default: Joi.number().min(1).required().messages({
    'number.base': `"conversion_to_default" should be a type of 'number'`,
    'number.min': `"conversion_to_default" must be at least 1`,
    'any.required': `"conversion_to_default" is a required field`,
  }),
  sale_price: Joi.number().min(0).required().messages({
    'number.base': `"sale_price" should be a type of 'number'`,
    'number.min': `"sale_price" cannot be negative`,
    'any.required': `"sale_price" is a required field`,
  }),
});

// Stock update validation schema (all fields optional for updates)
const updateStockValidationSchema = Joi.object({
  product: Joi.string().hex().length(24).optional().messages({
    'string.base': `"product" should be a type of 'text'`,
    'string.hex': `"product" must be a valid MongoDB ObjectId`,
    'string.length': `"product" must be exactly 24 characters long`,
  }),
  batchNumber: Joi.string().min(1).max(100).optional().messages({
    'string.base': `"batchNumber" should be a type of 'text'`,
    'string.empty': `"batchNumber" cannot be an empty field`,
    'string.min': `"batchNumber" should have a minimum length of {#limit}`,
    'string.max': `"batchNumber" should have a maximum length of {#limit}`,
  }),
  expiry_date: Joi.date().greater('now').allow(null, '').optional().messages({
    'date.base': `"expiry_date" should be a valid date`,
    'date.greater': `"expiry_date" must be a future date`,
  }),
  location: Joi.string().valid('Inventory', 'Pharmacy').optional().messages({
    'string.base': `"location" should be a type of 'text'`,
    'any.only': `"location" must be either 'Inventory' or 'Pharmacy'`,
  }),
  quantity: Joi.number().min(0).optional().messages({
    'number.base': `"quantity" should be a type of 'number'`,
    'number.min': `"quantity" cannot be negative`,
  }),
  unit: Joi.string().min(1).max(50).optional().messages({
    'string.base': `"unit" should be a type of 'text'`,
    'string.empty': `"unit" cannot be an empty field`,
    'string.min': `"unit" should have a minimum length of {#limit}`,
    'string.max': `"unit" should have a maximum length of {#limit}`,
  }),
  conversion_to_default: Joi.number().min(1).optional().messages({
    'number.base': `"conversion_to_default" should be a type of 'number'`,
    'number.min': `"conversion_to_default" must be at least 1`,
  }),
  purchasePricePerBaseUnit: Joi.number().min(0).optional().messages({
    'number.base': `"sale_price" should be a type of 'number'`,
    'number.min': `"sale_price" cannot be negative`,
  }),
  minLevel: Joi.number().min(0).optional().messages({
    'number.base': `"sale_price" should be a type of 'number'`,
    'number.min': `"sale_price" cannot be negative`,
  }),
});

module.exports = {
  stockValidationSchema,
  updateStockValidationSchema,
};
