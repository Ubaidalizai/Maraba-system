/**
 * Migrate stock quantities/prices from mathematical base → product primary unit.
 * Safe for primary-only products (conversion = 1): no change.
 *
 * Usage: node Backend/scripts/migrateStockToPrimaryUnit.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Stock = require('../models/stock.model');
const EmployeeStock = require('../models/employeeStock.model');
const Product = require('../models/product.model');
const {
  migrateMathBaseQtyToPrimary,
  migrateMathBasePriceToPrimary,
} = require('../utils/primaryUnitStock');

async function migrateCollection(Model, label) {
  const rows = await Model.find({ isDeleted: { $ne: true } });
  let updated = 0;

  for (const row of rows) {
    const product = await Product.findById(row.product).populate('baseUnit');
    if (!product?.baseUnit) continue;

    const primary = product.baseUnit;
    const conv = primary.conversion_to_base || 1;
    if (conv <= 1) continue;

    const newQty = migrateMathBaseQtyToPrimary(row.quantity, primary);
    const newPrice = migrateMathBasePriceToPrimary(
      row.purchasePricePerBaseUnit ?? 0,
      primary
    );

    if (
      Math.abs(newQty - row.quantity) > 1e-9 ||
      Math.abs(newPrice - (row.purchasePricePerBaseUnit ?? 0)) > 1e-9
    ) {
      row.quantity = newQty;
      row.purchasePricePerBaseUnit = newPrice;
      row.unit = product.baseUnit._id;
      await row.save();
      updated += 1;
    }
  }

  console.log(`${label}: ${updated} row(s) migrated`);
}

async function migrateProductsLatestPrice() {
  const products = await Product.find({ isDeleted: { $ne: true } }).populate(
    'baseUnit'
  );
  let updated = 0;

  for (const product of products) {
    const primary = product.baseUnit;
    if (!primary || (primary.conversion_to_base || 1) <= 1) continue;

    const newPrice = migrateMathBasePriceToPrimary(
      product.latestPurchasePrice ?? 0,
      primary
    );
    if (Math.abs(newPrice - (product.latestPurchasePrice ?? 0)) > 1e-9) {
      product.latestPurchasePrice = newPrice;
      await product.save();
      updated += 1;
    }
  }

  console.log(`Products latestPurchasePrice: ${updated} updated`);
}

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('Set MONGODB_URI or MONGO_URI');
    process.exit(1);
  }

  await mongoose.connect(uri);
  await migrateCollection(Stock, 'Stock');
  await migrateCollection(EmployeeStock, 'EmployeeStock');
  await migrateProductsLatestPrice();
  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
