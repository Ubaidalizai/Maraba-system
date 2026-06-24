import { formatNumber } from "./helper";

/** Product primary unit only — used on purchase forms. */
export function getPurchaseUnitsForProduct(product, allUnits) {
  if (!product || !allUnits?.length) return [];

  const productUnitId = product.baseUnit?._id || product.baseUnit;
  const productUnit = allUnits.find((u) => u._id === productUnitId);
  return productUnit ? [productUnit] : [];
}

/** Primary + all sub-units sharing the same mathematical base (kg, g, mg, carton). */
export function getSaleUnitsForProduct(product, allUnits) {
  if (!product || !allUnits?.length) return [];

  const productUnitId = product.baseUnit?._id || product.baseUnit;
  const productUnit = allUnits.find((u) => u._id === productUnitId);
  if (!productUnit) return [];

  const mathBaseId = productUnit.is_base_unit
    ? productUnit._id
    : productUnit.base_unit?._id || productUnit.base_unit;

  const saleUnits = allUnits.filter((u) => {
    if (String(u._id) === String(productUnit._id)) return true;
    const uBase = u.base_unit?._id || u.base_unit;
    if (String(u._id) === String(mathBaseId)) return true;
    if (uBase && String(uBase) === String(mathBaseId)) return true;
    return false;
  });

  return saleUnits.sort(
    (a, b) => (a.conversion_to_base || 1) - (b.conversion_to_base || 1)
  );
}

/** Stored stock cost is per primary unit (e.g. AFN/carton). */
export function pricePerPrimaryUnit(storedPricePerPrimary, primaryUnit) {
  return Number(storedPricePerPrimary) || 0;
}

/** Convert line quantity in `fromUnit` → product primary unit (matches backend toStockQuantity). */
export function toPrimaryUnitQuantity(qty, fromUnit, primaryUnit) {
  const mathBase = Number(qty) * (fromUnit?.conversion_to_base || 1);
  const primaryConv = primaryUnit?.conversion_to_base || 1;
  if (primaryConv <= 0) return mathBase;
  return mathBase / primaryConv;
}

/** Minimum sale price per selected unit from stored primary-unit cost. */
export function minSalePriceForUnit(storedPricePerPrimary, saleUnit, primaryUnit) {
  const primaryPrice = Number(storedPricePerPrimary) || 0;
  if (primaryPrice <= 0 || !saleUnit || !primaryUnit) return 0;
  const primaryQtyPerOneSaleUnit = toPrimaryUnitQuantity(1, saleUnit, primaryUnit);
  return primaryPrice * primaryQtyPerOneSaleUnit;
}

/** Sub-unit price from stored primary cost (e.g. kg when primary is carton). */
export function pricePerSubUnit(storedPricePerPrimary, primaryUnit) {
  const primaryPrice = Number(storedPricePerPrimary) || 0;
  if (!primaryUnit?.base_unit || !primaryUnit.conversion_to_base) return null;
  if (primaryPrice <= 0) return null;
  return primaryPrice / primaryUnit.conversion_to_base;
}

export function getSubUnitName(primaryUnit) {
  if (!primaryUnit?.base_unit || !primaryUnit.conversion_to_base) return null;
  return primaryUnit.base_unit?.name || primaryUnit.base_unit || null;
}

export function hasSubUnit(primaryUnit) {
  return (
    !!primaryUnit?.base_unit &&
    Number(primaryUnit.conversion_to_base) > 1
  );
}

// Sale/purchase lines: quantity is expressed in the selected unit
export const formatUnitDisplay = (quantity, unit) => {
  if (!unit || !quantity) return quantity?.toString() || "0";

  if (unit.is_base_unit || !unit.base_unit || !unit.conversion_to_base) {
    return `${quantity} ${unit.name || ""}`;
  }

  const baseQuantity = (quantity * unit.conversion_to_base).toFixed(2);
  const baseUnitName = unit.base_unit?.name || unit.base_unit || "";

  return `${quantity} ${unit.name} (${baseQuantity} ${baseUnitName})`;
};

// Stock rows: quantity is stored in the product primary unit
export const formatStockQuantityDisplay = (quantity, unit) => {
  if (quantity == null || quantity === "") return "0";
  const qty = Number(quantity);
  if (!unit || Number.isNaN(qty)) return formatNumber(quantity);

  const unitName = unit.name || "";

  if (!hasSubUnit(unit)) {
    return `${formatNumber(qty)} ${unitName}`.trim();
  }

  const subName = getSubUnitName(unit);
  const subQty = qty * (unit.conversion_to_base || 1);

  return `${formatNumber(qty)} ${unitName} (${formatNumber(subQty)} ${subName})`;
};

// Sale hints: show cost in product primary unit
export const formatPurchasePriceDisplay = (stockItem, selectedProduct) => {
  const stored =
    stockItem?.purchasePricePerBaseUnit ??
    selectedProduct?.latestPurchasePrice ??
    0;

  if (stored <= 0) return null;

  const primaryUnit =
    stockItem?.unit ||
    selectedProduct?.baseUnit ||
    null;

  const primaryPrice = pricePerPrimaryUnit(stored, primaryUnit);
  const primaryName = primaryUnit?.name || "واحد";

  let text = `${primaryPrice.toLocaleString()} افغانی/${primaryName}`;

  const subName = getSubUnitName(primaryUnit);
  if (subName) {
    const subPrice = pricePerSubUnit(stored, primaryUnit);
    text += ` (${subPrice.toLocaleString()} افغانی/${subName})`;
  }

  return text;
};
