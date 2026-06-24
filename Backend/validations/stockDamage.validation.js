const Joi = require('joi');
const mongoose = require('mongoose');

const objectId = (value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.message('Invalid ObjectId format');
  }
  return value;
};

const damageItemSchema = Joi.object({
  product: Joi.string().custom(objectId).required(),
  unit: Joi.string().custom(objectId).required(),
  quantity: Joi.number().positive().precision(6).required(),
  batchNumber: Joi.string().trim().min(1).max(100).optional().allow(null, ''),
  notes: Joi.string().max(300).optional().allow('', null),
});

const createStockDamageSchema = Joi.object({
  damageDate: Joi.date().optional(),
  location: Joi.string().valid('warehouse', 'store', 'employee').required(),
  employee: Joi.string().custom(objectId).optional().allow(null, ''),
  damageType: Joi.string()
    .valid('broken', 'expired', 'spoiled', 'theft', 'other')
    .default('other'),
  description: Joi.string().max(500).optional().allow('', null),
  items: Joi.array().items(damageItemSchema).min(1).required(),
});

module.exports = {
  createStockDamageSchema,
  damageItemSchema,
};
