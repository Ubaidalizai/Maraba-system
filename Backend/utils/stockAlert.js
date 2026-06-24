/**
 * Stock alert level — aligned with Frontend/src/utilies/stockStatus.js
 * and getStockReport in stock.controller.js.
 * @returns {'normal' | 'low' | 'critical' | 'out'}
 */
function computeInventoryStockLevel(quantity, minLevel) {
  const q = Number(quantity);
  const m = Number(minLevel) || 0;

  if (!Number.isFinite(q) || q < 0) return 'normal';
  if (q === 0) return 'out';

  if (m > 0) {
    const difference = q - m;
    if (difference <= 0) {
      return q <= m * 0.5 ? 'critical' : 'low';
    }
  }
  return 'normal';
}

/** Count stock rows that appear on the Low Stock tab. */
function countLowStockAlerts(stocks) {
  let count = 0;
  for (const stock of stocks) {
    const level = computeInventoryStockLevel(
      stock.quantity,
      stock.minLevel ?? 0
    );
    if (level === 'normal') continue;
    if (stock.location === 'warehouse' && level === 'out') continue;
    count += 1;
  }
  return count;
}

module.exports = {
  computeInventoryStockLevel,
  countLowStockAlerts,
};
