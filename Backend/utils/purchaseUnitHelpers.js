const AppError = require('./AppError');

/**
 * Purchases must use the product's primary unit (product.baseUnit), e.g. carton.
 * Sub-units (e.g. kg) are for sales only.
 */
function assertPurchaseItemUsesPrimaryUnit(product, unitId) {
  const primaryId = product.baseUnit?._id || product.baseUnit;
  if (!primaryId) {
    throw new AppError('محصول اصلي واحد نلري', 400);
  }
  if (String(unitId) !== String(primaryId)) {
    throw new AppError(
      'رانیول یوازې د محصول اصلي واحد (لکه کارټن) په توګه ترسره کېدای شي. فرعي واحد (لکه کیلو) یوازې د پلور لپاره دی.',
      400
    );
  }
}

module.exports = {
  assertPurchaseItemUsesPrimaryUnit,
};
