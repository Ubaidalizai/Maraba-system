/** Client helpers for purchase edit quantity limits (mirrors backend rules). */

export function findLineConstraint(constraints, item) {
  if (!constraints?.lines?.length) return null;
  const batch = item.batchNumber?.trim() || 'DEFAULT';
  return constraints.lines.find(
    (line) =>
      String(line.productId) === String(item.product) &&
      (line.batchNumber || 'DEFAULT') === batch
  );
}

export function getMinQuantityWarning(constraints, item, t) {
  const line = findLineConstraint(constraints, item);
  if (!line?.canReduce) return null;

  const qty = Number(item.quantity);
  if (Number.isNaN(qty) || qty + 0.0001 >= line.minQuantity) return null;

  return t('purchaseModal.minQuantityError', {
    product: line.productName,
    batch: line.batchNumber,
    min: line.minQuantity,
    unit: line.unitName,
    consumed: line.consumedBase,
  });
}

export function validateAllItemsAgainstConstraints(items, constraints, t) {
  const warnings = [];
  for (const item of items) {
    const msg = getMinQuantityWarning(constraints, item, t);
    if (msg) warnings.push(msg);
  }
  return warnings;
}
