const AppError = require('./AppError');
const Stock = require('../models/stock.model');
const Product = require('../models/product.model');
const EmployeeStock = require('../models/employeeStock.model');
const {
  toStockQuantity,
  loadPrimaryUnitForProduct,
} = require('./primaryUnitStock');

function ensureBatchStockFields(batch, product) {
  if (!batch.unit) batch.unit = product.baseUnit;
  if (
    batch.purchasePricePerBaseUnit === undefined ||
    batch.purchasePricePerBaseUnit === null
  ) {
    batch.purchasePricePerBaseUnit = product.latestPurchasePrice || 0;
  }
}

/**
 * Deduct stock for one damage line.
 * Stock quantity is in product primary unit.
 * @returns {{ costPerBaseUnit: number, lineLossAmount: number, baseQty: number, batchNumber: string }}
 */
async function deductDamageLineStock({
  session,
  location,
  employeeId,
  item,
  product,
  unit,
}) {
  const primaryUnit = await loadPrimaryUnitForProduct(product._id, session);
  const stockQty = toStockQuantity(item.quantity, unit, primaryUnit);
  const batchNumber = item.batchNumber || 'DEFAULT';

  if (location === 'employee') {
    if (!employeeId) {
      throw new AppError('د کارکوونکي ID اړین دی', 400);
    }

    const empStock = await EmployeeStock.findOne({
      employee: employeeId,
      product: product._id,
      batchNumber,
    }).session(session);

    if (!empStock || empStock.quantity_in_hand < stockQty) {
      throw new AppError(
        `کارکوونکی د ${product.name} لپاره په ${batchNumber} بیچ کې ناکافي سټاک لري`,
        400
      );
    }

    const costPerBaseUnit =
      empStock.purchasePricePerBaseUnit || product.latestPurchasePrice || 0;
    empStock.quantity_in_hand -= stockQty;
    await empStock.save({ session });

    return {
      costPerBaseUnit,
      lineLossAmount: Math.round(costPerBaseUnit * stockQty * 100) / 100,
      baseQty: stockQty,
      batchNumber,
    };
  }

  const stockLocation = location === 'warehouse' ? 'warehouse' : 'store';
  let remainingQty = stockQty;
  let totalCost = 0;
  let usedBatch = batchNumber;

  if (product.trackByBatch && item.batchNumber) {
    const batchStock = await Stock.findOne({
      product: product._id,
      batchNumber: item.batchNumber,
      location: stockLocation,
      isDeleted: { $ne: true },
    }).session(session);

    if (!batchStock || batchStock.quantity < remainingQty) {
      throw new AppError(
        `د ${product.name} لپاره په ${item.batchNumber} بیچ کې ناکافي سټاک`,
        400
      );
    }

    ensureBatchStockFields(batchStock, product);
    batchStock.quantity -= remainingQty;
    await batchStock.save({ session });
    totalCost = batchStock.purchasePricePerBaseUnit * remainingQty;
    usedBatch = batchStock.batchNumber;
    remainingQty = 0;
  } else if (product.trackByBatch && !item.batchNumber) {
    const availableBatches = await Stock.find({
      product: product._id,
      location: stockLocation,
      quantity: { $gt: 0 },
      isDeleted: { $ne: true },
    })
      .sort({ expiryDate: 1, createdAt: 1 })
      .session(session);

    if (availableBatches.length === 0) {
      throw new AppError(`د ${product.name} لپاره سټاک شتون نلري`, 400);
    }

    for (const batch of availableBatches) {
      if (remainingQty <= 0) break;
      const deductQty = Math.min(remainingQty, batch.quantity);
      ensureBatchStockFields(batch, product);
      batch.quantity -= deductQty;
      remainingQty -= deductQty;
      await batch.save({ session });
      if (totalCost === 0) usedBatch = batch.batchNumber;
      totalCost += batch.purchasePricePerBaseUnit * deductQty;
    }

    if (remainingQty > 0) {
      throw new AppError(`د ${product.name} لپاره ټول سټاک ناکافي دی`, 400);
    }
  } else {
    const defaultBatch = await Stock.findOne({
      product: product._id,
      batchNumber: batchNumber || 'DEFAULT',
      location: stockLocation,
      isDeleted: { $ne: true },
    }).session(session);

    if (!defaultBatch || defaultBatch.quantity < remainingQty) {
      throw new AppError(`د ${product.name} لپاره ناکافي سټاک`, 400);
    }

    ensureBatchStockFields(defaultBatch, product);
    defaultBatch.quantity -= remainingQty;
    await defaultBatch.save({ session });
    totalCost = defaultBatch.purchasePricePerBaseUnit * remainingQty;
    usedBatch = defaultBatch.batchNumber || 'DEFAULT';
  }

  const costPerBaseUnit = stockQty > 0 ? totalCost / stockQty : 0;
  return {
    costPerBaseUnit,
    lineLossAmount: Math.round(totalCost * 100) / 100,
    baseQty: stockQty,
    batchNumber: usedBatch,
  };
}

async function restoreDamageLineStock({
  session,
  location,
  employeeId,
  line,
  product,
}) {
  const stockQty = line.baseQuantity;
  const batchNumber = line.batchNumber || 'DEFAULT';

  if (location === 'employee') {
    await EmployeeStock.findOneAndUpdate(
      { employee: employeeId, product: line.product, batchNumber },
      {
        $inc: { quantity_in_hand: stockQty },
        $setOnInsert: {
          purchasePricePerBaseUnit: line.costPerBaseUnit || 0,
          batchNumber,
        },
      },
      { upsert: true, session }
    );
    return;
  }

  const stockLocation = location === 'warehouse' ? 'warehouse' : 'store';
  const stock = await Stock.findOne({
    product: line.product,
    batchNumber,
    location: stockLocation,
  }).session(session);

  if (stock) {
    stock.quantity += stockQty;
    await stock.save({ session });
    return;
  }

  await Stock.create(
    [
      {
        product: line.product,
        unit: product.baseUnit,
        batchNumber,
        location: stockLocation,
        quantity: stockQty,
        purchasePricePerBaseUnit: line.costPerBaseUnit || 0,
      },
    ],
    { session }
  );
}

module.exports = {
  deductDamageLineStock,
  restoreDamageLineStock,
};
