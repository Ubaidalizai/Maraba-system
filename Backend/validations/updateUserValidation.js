const Joi = require("joi");

// Update user by ID validation schema (admin only)
const updateUserValidationSchema = Joi.object({
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

  role: Joi.string()
    .valid("user", "admin", "superadmin", "manager")
    .optional()
    .messages({
      "string.base": `"role" should be a type of 'text'`,
      "any.only": `"role" must be one of [user, admin, superadmin, manager]`,
    }),

  isActive: Joi.boolean().optional().messages({
    "boolean.base": `"isActive" should be a boolean`,
  }),
});

module.exports = {
  updateUserValidationSchema,
};
