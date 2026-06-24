const Stock = require('../models/stock.model');
const Product = require('../models/product.model');
const AppError = require('./AppError');
const {
  loadUnitMap,
  toStockQuantityForItem,
} = require('./purchaseEditStock');
const { loadPrimaryUnitMap, purchasePriceForStock } = require('./primaryUnitStock');

/**
 * On soft-delete: only remove stock still at the purchase receipt location
 * (e.g. warehouse after part was transferred to store). Persists per-line amount.
 */
async function undoPurchaseStockForDelete(session, purchase, items) {
  const location = purchase.stockLocation || 'warehouse';
  const unitMap = await loadUnitMap(items, session);
  const productIds = items.map((i) => i.product?._id || i.product);
  const primaryUnitMap = await loadPrimaryUnitMap(productIds, session);

  for (const item of items) {
    const productId = item.product?._id || item.product;
    const batchNum = item.batchNumber || 'DEFAULT';
    const originalStockQty = toStockQuantityForItem(
      item,
      unitMap,
      primaryUnitMap
    );

    const stock = await Stock.findOne({
      product: productId,
      batchNumber: batchNum,
      location,
      isDeleted: false,
    }).session(session);

    const availableStock = Math.max(0, stock?.quantity ?? 0);
    const reverseStock = Math.min(originalStockQty, availableStock);

    if (reverseStock > 0) {
      await Stock.findOneAndUpdate(
        {
          product: productId,
          batchNumber: batchNum,
          location,
        },
        { $inc: { quantity: -reverseStock } },
        { session }
      );
    }

    item.stockReversedBase = reverseStock;
    await item.save({ session });
  }
}

/**
 * On restore: re-apply only what was removed on delete (stockReversedBase per line).
 */
async function redoPurchaseStockForRestore(session, purchase, items) {
  const location = purchase.stockLocation || 'warehouse';
  const unitMap = await loadUnitMap(items, session);
  const productIds = items.map((i) => i.product?._id || i.product);
  const primaryUnitMap = await loadPrimaryUnitMap(productIds, session);

  for (const item of items) {
    const productId = item.product?._id || item.product;
    const batchNum = item.batchNumber || 'DEFAULT';

    const product = await Product.findById(productId).session(session);
    if (!product) throw new AppError('محصول ونه موندل شو', 404);

    const originalStockQty = toStockQuantityForItem(
      item,
      unitMap,
      primaryUnitMap
    );
    const restoreStock =
      item.stockReversedBase != null
        ? Number(item.stockReversedBase)
        : originalStockQty;

    if (restoreStock <= 0) {
      item.stockReversedBase = null;
      await item.save({ session });
      continue;
    }

    const stockPrice = purchasePriceForStock(item.unitPrice);

    await Stock.findOneAndUpdate(
      {
        product: productId,
        batchNumber: batchNum,
        location,
      },
      {
        $inc: { quantity: restoreStock },
        $set: {
          expiryDate: item.expiryDate || null,
          purchasePricePerBaseUnit: stockPrice,
          batchNumber: batchNum,
          unit: product.baseUnit,
          location,
        },
      },
      { upsert: true, session }
    );

    item.stockReversedBase = null;
    await item.save({ session });
  }
}

module.exports = {
  undoPurchaseStockForDelete,
  redoPurchaseStockForRestore,
};
