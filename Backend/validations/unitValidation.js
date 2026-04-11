const Joi = require('joi');

// Unit creation validation schema
const unitValidationSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required().messages({
    'string.empty': 'Unit name is required',
    'string.min': 'Unit name must be at least 1 character long',
    'string.max': 'Unit name must not exceed 100 characters',
    'any.required': 'Unit name is required',
  }),

  description: Joi.string().trim().max(500).allow('').optional().messages({
    'string.max': 'Description must not exceed 500 characters',
  }),

  conversion_to_base: Joi.number().positive().precision(6).required().messages({
    'number.positive': 'Conversion to base must be a positive number',
    'any.required': 'Conversion to base is required',
  }),

  is_base_unit: Joi.boolean().default(false).messages({
    'boolean.base': 'is_base_unit must be a boolean value',
  }),
});

// Unit update validation schema
const updateUnitValidationSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).optional().messages({
    'string.empty': 'Unit name cannot be empty',
    'string.min': 'Unit name must be at least 1 character long',
    'string.max': 'Unit name must not exceed 100 characters',
  }),

  description: Joi.string().trim().max(500).allow('').optional().messages({
    'string.max': 'Description must not exceed 500 characters',
  }),

  conversion_to_base: Joi.number().positive().precision(6).optional().messages({
    'number.positive': 'Conversion to base must be a positive number',
  }),

  is_base_unit: Joi.boolean().optional().messages({
    'boolean.base': 'is_base_unit must be a boolean value',
  }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

module.exports = {
  unitValidationSchema,
  updateUnitValidationSchema,
};
