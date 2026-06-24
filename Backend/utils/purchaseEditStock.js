const Stock = require('../models/stock.model');
const Unit = require('../models/unit.model');
const Product = require('../models/product.model');
const AppError = require('./AppError');
const {
  toStockQuantity,
  fromStockQuantity,
  loadPrimaryUnitMap,
} = require('./primaryUnitStock');

const stockKey = (productId, batchNumber) =>
  `${String(productId)}|${batchNumber || 'DEFAULT'}`;

const parseStockKey = (key) => {
  const sep = key.indexOf('|');
  return {
    productId: key.slice(0, sep),
    batchNumber: key.slice(sep + 1),
  };
};

async function loadUnitMap(itemList, session) {
  const unitIds = [
    ...new Set(
      itemList
        .map((i) => i.unit?._id || i.unit)
        .filter(Boolean)
        .map(String)
    ),
  ];
  if (unitIds.length === 0) return {};

  let q = Unit.find({ _id: { $in: unitIds } });
  if (session) q = q.session(session);
  const units = await q.lean();
  return Object.fromEntries(units.map((u) => [String(u._id), u]));
}

function toStockQuantityForItem(item, unitMap, primaryUnitMap) {
  const productId = String(item.product?._id || item.product);
  const unitId = String(item.unit?._id || item.unit);
  const unit = unitMap[unitId];
  const primaryUnit = primaryUnitMap[productId];
  if (!unit || !primaryUnit) {
    throw new AppError('واحد یا محصول اصلي واحد ونه موندل شو', 400);
  }
  return toStockQuantity(item.quantity, unit, primaryUnit);
}

function toDisplayQuantity(stockQty, unit, primaryUnit) {
  return fromStockQuantity(stockQty, unit, primaryUnit);
}

/**
 * Per original purchase line: minimum qty (in that line's unit) after edit
 * if product+batch+location stay the same.
 */
async function getPurchaseLineConstraints(purchase, oldItems, session = null) {
  const location = purchase.stockLocation || 'warehouse';
  const unitMap = await loadUnitMap(oldItems, session);
  const productIds = oldItems.map((i) => i.product?._id || i.product);
  const primaryUnitMap = await loadPrimaryUnitMap(productIds, session);

  const lines = [];

  for (const old of oldItems) {
    const productId = old.product?._id || old.product;
    const batch = old.batchNumber || 'DEFAULT';
    const unitId = String(old.unit?._id || old.unit);
    const unit = unitMap[unitId];
    const primaryUnit = primaryUnitMap[String(productId)];

    let stockQuery = Stock.findOne({
      product: productId,
      batchNumber: batch,
      location,
      isDeleted: false,
    });
    if (session) stockQuery = stockQuery.session(session);
    const stock = await stockQuery.lean();

    const originalStockQty = toStockQuantityForItem(old, unitMap, primaryUnitMap);
    const currentStockQty = stock?.quantity ?? 0;
    const consumedStock = Math.max(0, originalStockQty - currentStockQty);
    const minQuantity = old.quantity != null
      ? fromStockQuantity(consumedStock, unit, primaryUnit)
      : consumedStock;

    lines.push({
      productId: String(productId),
      productName: old.product?.name || '',
      batchNumber: batch,
      unitId,
      unitName: unit?.name || '',
      originalQuantity: old.quantity,
      originalStockQty,
      currentStockQty,
      consumedStock,
      consumedBase: consumedStock,
      minQuantity,
      minStock: consumedStock,
      canReduce: consumedStock > 1e-9,
    });
  }

  return { lines };
}

async function validatePurchaseEditStock(purchase, oldItems, newItems) {
  const constraints = await getPurchaseLineConstraints(purchase, oldItems);
  const issues = [];

  const unitMap = await loadUnitMap([...oldItems, ...newItems]);
  const productIds = [...oldItems, ...newItems].map(
    (i) => i.product?._id || i.product
  );
  const primaryUnitMap = await loadPrimaryUnitMap(productIds);

  const oldByKey = new Map();
  for (const old of oldItems) {
    const key = stockKey(old.product?._id || old.product, old.batchNumber);
    oldByKey.set(key, old);
  }

  const newByKey = new Map();
  for (const n of newItems) {
    const batch = n.batchNumber?.trim()
      ? n.batchNumber.trim()
      : 'DEFAULT';
    const key = stockKey(n.product, batch);
    newByKey.set(key, n);
  }

  for (const c of constraints) {
    const key = stockKey(c.productId, c.batchNumber);
    const newLine = newByKey.get(key);
    if (!newLine) continue;

    const old = oldByKey.get(key);
    if (!old) continue;

    const unitId = String(newLine.unit);
    const unit = unitMap[unitId];
    const primaryUnit = primaryUnitMap[c.productId];
    const newStockQty = toStockQuantity(newLine.quantity, unit, primaryUnit);
    const oldStockQty = toStockQuantityForItem(old, unitMap, primaryUnitMap);

    if (newStockQty < c.minStock - 1e-9) {
      const minInNewUnit = toDisplayQuantity(c.minStock, unit, primaryUnit);
      issues.push({
        productId: c.productId,
        batchNumber: c.batchNumber,
        messagePs: `د دې کرښې لږترلږه مقدار ${minInNewUnit} ${unit?.name || ''} دی (لا دمخه ${c.consumedStock} مصرف شوي).`,
      });
    }

    if (Math.abs(newStockQty - oldStockQty) > 1e-9 && c.consumedStock > 0) {
      // batch/location change handled elsewhere
    }
  }

  return { valid: issues.length === 0, issues };
}

/** @deprecated use toStockQuantityForItem — stock is in primary unit */
function toBaseQuantity(item, unitMap) {
  const unitId = String(item.unit?._id || item.unit);
  const unit = unitMap[unitId];
  if (!unit) {
    throw new AppError('واحد ونه موندل شو', 400);
  }
  const conversion = unit.conversion_to_base || 1;
  return Number(item.quantity) * conversion;
}

module.exports = {
  getPurchaseLineConstraints,
  validatePurchaseEditStock,
  loadUnitMap,
  toStockQuantityForItem,
  toBaseQuantity,
};
