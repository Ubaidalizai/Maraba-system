const Unit = require('../models/unit.model');
const Product = require('../models/product.model');
const AppError = require('./AppError');

/** conversion_to_base for the product's primary (stock) unit */
function primaryConversion(primaryUnit) {
  return primaryUnit?.conversion_to_base || 1;
}

/** Quantity in mathematical base (e.g. kg) */
function toMathBaseQuantity(qty, unit) {
  return Number(qty) * (unit?.conversion_to_base || 1);
}

/**
 * Stock.quantity is stored in the product primary unit (product.baseUnit).
 * Convert any line unit → stock primary unit.
 */
function toStockQuantity(qty, fromUnit, primaryUnit) {
  const mathBase = toMathBaseQuantity(qty, fromUnit);
  const primaryConv = primaryConversion(primaryUnit);
  if (primaryConv <= 0) return mathBase;
  return mathBase / primaryConv;
}

/** Stock primary qty → another unit (for display / checks) */
function fromStockQuantity(stockQty, toUnit, primaryUnit) {
  const mathBase = Number(stockQty) * primaryConversion(primaryUnit);
  const toConv = toUnit?.conversion_to_base || 1;
  if (toConv <= 0) return mathBase;
  return mathBase / toConv;
}

/** Purchase lines use primary unit — store price per primary unit */
function purchasePriceForStock(unitPrice) {
  return Number(unitPrice) || 0;
}

async function loadPrimaryUnitForProduct(productId, session = null) {
  let productQuery = Product.findById(productId).populate('baseUnit');
  if (session) productQuery = productQuery.session(session);
  const product = await productQuery;
  if (!product) throw new AppError('محصول ونه موندل شو', 404);
  if (!product.baseUnit) throw new AppError('محصول اصلي واحد نلري', 400);
  return product.baseUnit;
}

async function loadPrimaryUnitMap(productIds, session = null) {
  const ids = [...new Set(productIds.map(String).filter(Boolean))];
  if (ids.length === 0) return {};

  let q = Product.find({ _id: { $in: ids } }).populate('baseUnit');
  if (session) q = q.session(session);
  const products = await q.lean();

  return Object.fromEntries(
    products.map((p) => [String(p._id), p.baseUnit])
  );
}

/** One-time migration: old stock qty was mathematical base */
function migrateMathBaseQtyToPrimary(mathBaseQty, primaryUnit) {
  const conv = primaryConversion(primaryUnit);
  if (conv <= 1) return mathBaseQty;
  return mathBaseQty / conv;
}

/** One-time migration: old price was per mathematical base */
function migrateMathBasePriceToPrimary(pricePerMathBase, primaryUnit) {
  const conv = primaryConversion(primaryUnit);
  if (conv <= 1) return pricePerMathBase;
  return pricePerMathBase * conv;
}

module.exports = {
  primaryConversion,
  toMathBaseQuantity,
  toStockQuantity,
  fromStockQuantity,
  purchasePriceForStock,
  loadPrimaryUnitForProduct,
  loadPrimaryUnitMap,
  migrateMathBaseQtyToPrimary,
  migrateMathBasePriceToPrimary,
};
