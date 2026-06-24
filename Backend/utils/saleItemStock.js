const AppError = require('./AppError');
const Stock = require('../models/stock.model');
const Product = require('../models/product.model');
const Unit = require('../models/unit.model');
const EmployeeStock = require('../models/employeeStock.model');
const {
  incrementStoreStock,
  incrementEmployeeStock,
  getStockBatchMeta,
} = require('./saleReturnHelpers');
const {
  toStockQuantity,
  toMathBaseQuantity,
  loadPrimaryUnitForProduct,
} = require('./primaryUnitStock');

function ensureBatchStockFields(batch, product) {
  if (!batch.unit) {
    batch.unit = product.baseUnit;
  }
  if (
    batch.purchasePricePerBaseUnit === undefined ||
    batch.purchasePricePerBaseUnit === null
  ) {
    batch.purchasePricePerBaseUnit = product.latestPurchasePrice || 0;
  }
}

function getRestoreBatches(saleItem, stockQty) {
  if (saleItem.batchesUsed?.length) {
    return saleItem.batchesUsed.map((b) => ({
      batchNumber: b.batchNumber,
      quantityUsed: b.quantityUsed,
      costPerUnit: b.costPerUnit,
    }));
  }

  const batchNumber = saleItem.batchNumber;
  if (batchNumber === 'MULTI') {
    throw new AppError(
      'د څو بیچونو پلور بیرته نه شي اخیستل کیدای پرته له بیچ معلوماتو',
      400
    );
  }

  return [
    {
      batchNumber: batchNumber || 'DEFAULT',
      quantityUsed: stockQty,
      costPerUnit: saleItem.costPricePerUnit || 0,
    },
  ];
}

/**
 * Restore stock for a sale line (reverse of sale deduction).
 */
async function restoreSaleItemStock({ session, sale, saleItem }) {
  const unit = await Unit.findById(saleItem.unit).session(session);
  if (!unit) throw new AppError('واحد ونه موندل شو', 400);

  const primaryUnit = await loadPrimaryUnitForProduct(saleItem.product, session);
  const stockQty = toStockQuantity(saleItem.quantity, unit, primaryUnit);
  const batches = getRestoreBatches(saleItem, stockQty);

  if (sale.employee) {
    for (const b of batches) {
      await incrementEmployeeStock({
        session,
        employee: sale.employee,
        productId: saleItem.product,
        batchNumber: b.batchNumber || 'DEFAULT',
        stockQty: b.quantityUsed,
        costPerUnit: b.costPerUnit,
      });
    }
    return;
  }

  for (const b of batches) {
    const batchNumber = b.batchNumber || 'DEFAULT';
    const meta = await getStockBatchMeta(session, saleItem.product, batchNumber);
    await incrementStoreStock({
      session,
      productId: saleItem.product,
      batchNumber,
      stockQty: b.quantityUsed,
      purchasePricePerBaseUnit:
        b.costPerUnit ?? meta.purchasePricePerBaseUnit,
      expiryDate: meta.expiryDate,
    });
  }
}

/**
 * Deduct stock for one sale line (store FEFO/FIFO or employee batch).
 * Stock quantity is in product primary unit.
 */
async function deductSaleLineStock({ session, employeeId, item, product, unit }) {
  const primaryUnit = await loadPrimaryUnitForProduct(product._id, session);
  const stockDeduct = toStockQuantity(item.quantity, unit, primaryUnit);
  const mathBaseQty = toMathBaseQuantity(item.quantity, unit);
  let remainingQty = stockDeduct;
  let totalCost = 0;
  const batchesUsed = [];

  if (employeeId) {
    const targetBatch = item.batchNumber || 'DEFAULT';

    const empStock = await EmployeeStock.findOne({
      employee: employeeId,
      product: product._id,
      batchNumber: targetBatch,
    }).session(session);

    if (!empStock || empStock.quantity_in_hand < stockDeduct) {
      throw new AppError(
        `کارکوونکی د ${product.name} لپاره په ${targetBatch} بیچ کې ناکافي سټاک لري`,
        400
      );
    }

    empStock.quantity_in_hand -= stockDeduct;
    await empStock.save({ session });

    const costPerPrimary =
      empStock.purchasePricePerBaseUnit || product.latestPurchasePrice || 0;
    totalCost = costPerPrimary * stockDeduct;
    batchesUsed.push({
      batchNumber: targetBatch,
      quantityUsed: stockDeduct,
      costPerUnit: costPerPrimary,
    });

    return { totalCost, batchesUsed, baseQty: mathBaseQty };
  }

  if (product.trackByBatch) {
    if (item.batchNumber) {
      const batchStock = await Stock.findOne({
        product: product._id,
        batchNumber: item.batchNumber,
        location: 'store',
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

      totalCost += batchStock.purchasePricePerBaseUnit * remainingQty;
      batchesUsed.push({
        batchNumber: batchStock.batchNumber,
        quantityUsed: remainingQty,
        costPerUnit: batchStock.purchasePricePerBaseUnit,
      });
      remainingQty = 0;
    } else {
      const availableBatches = await Stock.find({
        product: product._id,
        location: 'store',
        quantity: { $gt: 0 },
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

        totalCost += batch.purchasePricePerBaseUnit * deductQty;
        batchesUsed.push({
          batchNumber: batch.batchNumber,
          quantityUsed: deductQty,
          costPerUnit: batch.purchasePricePerBaseUnit,
        });
      }

      if (remainingQty > 0) {
        throw new AppError(`د ${product.name} لپاره ټول سټاک ناکافي دی`, 400);
      }
    }
  } else {
    const defaultBatch = await Stock.findOne({
      product: product._id,
      batchNumber: 'DEFAULT',
      location: 'store',
    }).session(session);

    if (!defaultBatch || defaultBatch.quantity < remainingQty) {
      throw new AppError(`د ${product.name} لپاره ناکافي سټاک`, 400);
    }

    ensureBatchStockFields(defaultBatch, product);
    defaultBatch.quantity -= remainingQty;
    await defaultBatch.save({ session });
    totalCost += defaultBatch.purchasePricePerBaseUnit * remainingQty;
    batchesUsed.push({
      batchNumber: 'DEFAULT',
      quantityUsed: remainingQty,
      costPerUnit: defaultBatch.purchasePricePerBaseUnit,
    });
    remainingQty = 0;
  }

  return { totalCost, batchesUsed, baseQty: mathBaseQty };
}

function buildSaleItemPayload({
  saleId,
  product,
  unit,
  item,
  totalCost,
  batchesUsed,
  baseQty,
}) {
  const saleRevenue = item.unitPrice * item.quantity;
  const profit = saleRevenue - totalCost;

  return {
    sale: saleId,
    product: product._id,
    unit: unit._id,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: saleRevenue,
    profit,
    costPricePerUnit: baseQty > 0 ? totalCost / baseQty : 0,
    batchesUsed,
    batchNumber:
      batchesUsed.length === 1 ? batchesUsed[0].batchNumber : 'MULTI',
    cartonCount: item.cartonCount || undefined,
  };
}

/** Cost from line revenue minus stored profit (accurate for reports). */
const saleItemCostExpr = { $subtract: ['$totalPrice', '$profit'] };

module.exports = {
  restoreSaleItemStock,
  deductSaleLineStock,
  buildSaleItemPayload,
  saleItemCostExpr,
};
