const Joi = require("joi");

// User login validation schema
const loginValidationSchema = Joi.object({
  email: Joi.string()
    .email() // Valid email format
    .lowercase()
    .trim()
    .required()
    .messages({
      "string.base": `"email" should be a type of 'text'`,
      "string.empty": `"email" cannot be an empty field`,
      "string.email": `"email" must be a valid email`,
      "any.required": `"email" is a required field`,
    }),

  password: Joi.string()
    .min(8) // Minimum length of 8 characters
    .required()
    .messages({
      "string.base": `"password" should be a type of 'text'`,
      "string.empty": `"password" cannot be an empty field`,
      "string.min": `"password" should have a minimum length of {#limit}`,
      "any.required": `"password" is a required field`,
    }),
});

module.exports = {
  loginValidationSchema,
};
