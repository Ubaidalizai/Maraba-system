const Joi = require('joi');

// Employee creation validation schema
const employeeValidationSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required().messages({
    'string.empty': 'Employee name is required',
    'string.min': 'Employee name must be at least 1 character long',
    'string.max': 'Employee name must not exceed 200 characters',
    'any.required': 'Employee name is required',
  }),

  role: Joi.string()
    .valid('salesman', 'riding_man', 'cashier', 'manager', 'admin')
    .required()
    .messages({
      'any.only':
        'Role must be one of: salesman, riding_man, cashier, manager, admin',
      'any.required': 'Employee role is required',
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
  }).optional(),

  hire_date: Joi.date().optional().messages({
    'date.base': 'Hire date must be a valid date',
  }),
});

// Employee update validation schema
const updateEmployeeValidationSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).optional().messages({
    'string.empty': 'Employee name cannot be empty',
    'string.min': 'Employee name must be at least 1 character long',
    'string.max': 'Employee name must not exceed 200 characters',
  }),

  role: Joi.string()
    .valid('salesman', 'riding_man', 'cashier', 'manager', 'admin')
    .optional()
    .messages({
      'any.only':
        'Role must be one of: salesman, riding_man, cashier, manager, admin',
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
  }).optional(),

  hire_date: Joi.date().optional().messages({
    'date.base': 'Hire date must be a valid date',
  }),

  is_active: Joi.boolean().optional().messages({
    'boolean.base': 'is_active must be a boolean value',
  }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

module.exports = {
  employeeValidationSchema,
  updateEmployeeValidationSchema,
};
