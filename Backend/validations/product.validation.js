const Joi = require('joi');

exports.createProductSchema = Joi.object({
  name: Joi.string().trim().required(),
  description: Joi.string().allow(''),
  minLevel: Joi.number().min(0).default(0),
  trackByBatch: Joi.boolean().default(false),
  baseUnit: Joi.string().required(), // must be valid ObjectId
  latestPurchasePrice: Joi.number().min(0).default(0),
});

exports.updateProductSchema = Joi.object({
  name: Joi.string().trim(),
  description: Joi.string().allow(''),
  minLevel: Joi.number().min(0),
  trackByBatch: Joi.boolean(),
  baseUnit: Joi.string(),
});
