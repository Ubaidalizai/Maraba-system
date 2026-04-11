const Joi = require("joi");

// User registration validation schema
const userValidationSchema = Joi.object({
  name: Joi.string().min(2).required().messages({
    "string.base": `"name" should be a type of 'text'`,
    "string.empty": `"name" cannot be an empty field`,
    "string.min": `"name" should have a minimum length of {#limit}`,
    "any.required": `"name" is a required field`,
  }),
  email: Joi.string().email().lowercase().trim().required().messages({
    "string.base": `"email" should be a type of 'text'`,
    "string.empty": `"email" cannot be an empty field`,
    "string.email": `"email" must be a valid email`,
    "any.required": `"email" is a required field`,
  }),
  phone: Joi.string().required().messages({
    "string.base": `"phone" should be a type of 'text'`,
    "string.empty": `"phone" cannot be an empty field`,
    "any.required": `"phone" is a required field`,
  }),
  username: Joi.string().optional().messages({
    "string.base": `"username" should be a type of 'text'`,
  }),
  password: Joi.string().min(8).required().messages({
    "string.base": `"password" should be a type of 'text'`,
    "string.empty": `"password" cannot be an empty field`,
    "string.min": `"password" should have a minimum length of {#limit}`,
    "any.required": `"password" is a required field`,
  }),
  role: Joi.string()
    .valid("user", "admin", "superadmin", "manager")
    .default("user"),
  isActive: Joi.boolean().optional().default(true).messages({
    "boolean.base": `"isActive" should be a boolean`,
  }),
  image: Joi.string().allow(null).optional().messages({
    "string.base": `"image" should be a type of 'text'`,
  }),
}).default({ image: "default-user.jpg" }); // Set default image

module.exports = {
  userValidationSchema,
};
