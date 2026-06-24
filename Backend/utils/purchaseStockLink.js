const PurchaseItem = require('../models/purchaseItem.model');

/**
 * Find the most recent purchase line that introduced this product+batch.
 */
async function findLatestPurchaseForBatch(productId, batchNumber) {
  const batch = batchNumber || 'DEFAULT';
  const batchOr = [{ batchNumber: batch }];
  if (batch === 'DEFAULT') {
    batchOr.push({ batchNumber: null }, { batchNumber: '' });
  }

  const item = await PurchaseItem.findOne({
    product: productId,
    isDeleted: false,
    $or: batchOr,
  })
    .sort({ createdAt: -1 })
    .populate('purchase', 'purchaseDate isDeleted stockLocation')
    .lean();

  if (!item?.purchase || item.purchase.isDeleted) {
    return null;
  }

  return {
    purchaseId: item.purchase._id,
    purchaseDate: item.purchase.purchaseDate,
    stockLocation: item.purchase.stockLocation,
    purchaseItemId: item._id,
    unitPrice: item.unitPrice,
    expiryDate: item.expiryDate ?? null,
  };
}

module.exports = { findLatestPurchaseForBatch };
