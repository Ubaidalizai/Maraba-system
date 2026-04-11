const Joi = require("joi");

// Update current user profile validation schema
const updateProfileValidationSchema = Joi.object({
  name: Joi.string().min(2).optional().messages({
    "string.base": `"name" should be a type of 'text'`,
    "string.min": `"name" should have a minimum length of {#limit}`,
  }),

  email: Joi.string().email().lowercase().trim().optional().messages({
    "string.base": `"email" should be a type of 'text'`,
    "string.email": `"email" must be a valid email`,
  }),

  phone: Joi.string().optional().messages({
    "string.base": `"phone" should be a type of 'text'`,
  }),
});

module.exports = {
  updateProfileValidationSchema,
};
