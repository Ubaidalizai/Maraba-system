const Joi = require('joi');

// Supplier creation validation schema
const supplierValidationSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required().messages({
    'string.empty': 'Supplier name is required',
    'string.min': 'Supplier name must be at least 1 character long',
    'string.max': 'Supplier name must not exceed 200 characters',
    'any.required': 'Supplier name is required',
  }),

  contact_info: Joi.object({
    phone: Joi.string().trim().max(20).optional().messages({
      'string.max': 'Phone number must not exceed 20 characters',
    }),
    email: Joi.string().email().trim().lowercase().optional().messages({
      'string.email': 'Please provide a valid email address',
    }),
    address: Joi.string().trim().max(500).optional().messages({
      'string.max': 'Address must not exceed 500 characters',
    }),
    city: Joi.string().trim().max(100).optional().messages({
      'string.max': 'City must not exceed 100 characters',
    }),
    state: Joi.string().trim().max(100).optional().messages({
      'string.max': 'State must not exceed 100 characters',
    }),
    zip_code: Joi.string().trim().max(20).optional().messages({
      'string.max': 'Zip code must not exceed 20 characters',
    }),
  }).optional(),
});

// Supplier update validation schema
const updateSupplierValidationSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).optional().messages({
    'string.empty': 'Supplier name cannot be empty',
    'string.min': 'Supplier name must be at least 1 character long',
    'string.max': 'Supplier name must not exceed 200 characters',
  }),

  contact_info: Joi.object({
    phone: Joi.string().trim().max(20).optional().messages({
      'string.max': 'Phone number must not exceed 20 characters',
    }),
    email: Joi.string().email().trim().lowercase().optional().messages({
      'string.email': 'Please provide a valid email address',
    }),
    address: Joi.string().trim().max(500).optional().messages({
      'string.max': 'Address must not exceed 500 characters',
    }),
    city: Joi.string().trim().max(100).optional().messages({
      'string.max': 'City must not exceed 100 characters',
    }),
    state: Joi.string().trim().max(100).optional().messages({
      'string.max': 'State must not exceed 100 characters',
    }),
    zip_code: Joi.string().trim().max(20).optional().messages({
      'string.max': 'Zip code must not exceed 20 characters',
    }),
  }).optional(),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

module.exports = {
  supplierValidationSchema,
  updateSupplierValidationSchema,
};
