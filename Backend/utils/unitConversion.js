const Unit = require('../models/unit.model');

/**
 * Convert quantity from one unit to another unit
 * @param {Number} quantity - The quantity to convert
 * @param {String} fromUnitId - The source unit ID
 * @param {String} toUnitId - The target unit ID
 * @returns {Number} - The converted quantity
 */
const convertQuantity = async (quantity, fromUnitId, toUnitId) => {
  if (fromUnitId.toString() === toUnitId.toString()) {
    return quantity;
  }

  const [fromUnit, toUnit] = await Promise.all([
    Unit.findById(fromUnitId),
    Unit.findById(toUnitId),
  ]);

  if (!fromUnit || !toUnit) {
    throw new Error('Unit not found');
  }

  // Convert to base unit first, then to target unit
  const baseQuantity = quantity * fromUnit.conversion_to_base;
  const convertedQuantity = baseQuantity / toUnit.conversion_to_base;

  return convertedQuantity;
};

/**
 * Convert quantity to base unit
 * @param {Number} quantity - The quantity to convert
 * @param {String} unitId - The unit ID
 * @returns {Number} - The quantity in base unit
 */
const convertToBaseUnit = async (quantity, unitId) => {
  const unit = await Unit.findById(unitId);
  if (!unit) {
    throw new Error('Unit not found');
  }

  return quantity * unit.conversion_to_base;
};

/**
 * Convert quantity from base unit
 * @param {Number} baseQuantity - The quantity in base unit
 * @param {String} unitId - The target unit ID
 * @returns {Number} - The converted quantity
 */
const convertFromBaseUnit = async (baseQuantity, unitId) => {
  const unit = await Unit.findById(unitId);
  if (!unit) {
    throw new Error('Unit not found');
  }

  return baseQuantity / unit.conversion_to_base;
};

module.exports = {
  convertQuantity,
  convertToBaseUnit,
  convertFromBaseUnit,
};
