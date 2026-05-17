const Joi = require('joi');

// Customer creation validation schema
const customerValidationSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required().messages({
    'string.empty': 'د پیرودونکي نوم اړین دی',
    'string.min': 'د پیرودونکي نوم باید له کمه 1 توری وي',
    'string.max': 'د پیرودونکي نوم باید له 200 تورو زیات نه وي',
    'any.required': 'د پیرودونکي نوم اړین دی',
  }),

  contact_info: Joi.object({
    phone: Joi.string().trim().max(20).optional().messages({
      'string.max': 'د تیلیفون شمیره باید له 20 تورو زیات نه وي',
    }),
    email: Joi.string().email().trim().lowercase().optional().messages({
      'string.email': 'مهرباني وکړئ سمه برېښنا پته ولیکئ',
    }),
    address: Joi.string().trim().max(500).optional().messages({
      'string.max': 'ادرس باید له 500 تورو زیات نه وي',
    }),
    city: Joi.string().trim().max(100).optional().messages({
      'string.max': 'ښار باید له 100 تورو زیات نه وي',
    }),
    state: Joi.string().trim().max(100).optional().messages({
      'string.max': 'ایالت باید له 100 تورو زیات نه وي',
    }),
    zip_code: Joi.string().trim().max(20).optional().messages({
      'string.max': 'پوستي کوډ باید له 20 تورو زیات نه وي',
    }),
  }).optional(),
});

// Customer update validation schema
const updateCustomerValidationSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).optional().messages({
    'string.empty': 'د پیرودونکي نوم خالي نشي کیدای',
    'string.min': 'د پیرودونکي نوم باید له کمه 1 توری وي',
    'string.max': 'د پیرودونکي نوم باید له 200 تورو زیات نه وي',
  }),

  contact_info: Joi.object({
    phone: Joi.string().trim().max(20).optional().messages({
      'string.max': 'د تیلیفون شمیره باید له 20 تورو زیات نه وي',
    }),
    email: Joi.string().email().trim().lowercase().optional().messages({
      'string.email': 'مهرباني وکړئ سمه برېښنا پته ولیکئ',
    }),
    address: Joi.string().trim().max(500).optional().messages({
      'string.max': 'ادرس باید له 500 تورو زیات نه وي',
    }),
    city: Joi.string().trim().max(100).optional().messages({
      'string.max': 'ښار باید له 100 تورو زیات نه وي',
    }),
    state: Joi.string().trim().max(100).optional().messages({
      'string.max': 'ایالت باید له 100 تورو زیات نه وي',
    }),
    zip_code: Joi.string().trim().max(20).optional().messages({
      'string.max': 'پوستي کوډ باید له 20 تورو زیات نه وي',
    }),
  }).optional(),
})
  .min(1)
  .messages({
    'object.min': 'تازه کولو لپاره له کمه یو ساحه اړینه ده',
  });

module.exports = {
  customerValidationSchema,
  updateCustomerValidationSchema,
};
