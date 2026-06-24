/**
 * Expiry alert levels — mirrors inventory stock level logic (quantity vs minLevel).
 * Uses daysLeft vs notifyDays window.
 */

function startOfLocalDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Whole calendar days from today (local) until expiryDate. Negative = expired. */
function computeDaysLeft(expiryDate) {
  if (!expiryDate) return null;
  const exp = startOfLocalDay(new Date(expiryDate));
  const today = startOfLocalDay();
  return Math.round((exp - today) / (24 * 60 * 60 * 1000));
}

/**
 * @returns {'normal' | 'low' | 'critical' | 'out'}
 */
function computeExpiryAlertLevel(daysLeft, notifyDays) {
  const d = daysLeft;
  const n = Number(notifyDays) || 0;

  if (d === null || d === undefined || !Number.isFinite(Number(d))) {
    return 'normal';
  }
  if (d < 0) return 'out';

  if (n > 0) {
    if (d <= n) {
      return d <= n * 0.5 ? 'critical' : 'low';
    }
  }

  return 'normal';
}

/** Count stock rows that appear on the Expiring tab (alertLevel !== normal). */
function countExpiringAlerts(stocks, defaultNotifyDays) {
  let count = 0;
  for (const stock of stocks) {
    if (!stock.expiryDate || !(stock.quantity > 0)) continue;
    const notifyDays = resolveNotifyDays(
      stock.product?.notifyDaysBefore,
      defaultNotifyDays
    );
    const daysLeft = computeDaysLeft(stock.expiryDate);
    const level = computeExpiryAlertLevel(daysLeft, notifyDays);
    if (level !== 'normal') count += 1;
  }
  return count;
}

function resolveNotifyDays(productNotifyDaysBefore, settingsExpiryNotifyDays) {
  if (
    productNotifyDaysBefore !== null &&
    productNotifyDaysBefore !== undefined &&
    productNotifyDaysBefore !== ''
  ) {
    const p = Number(productNotifyDaysBefore);
    if (Number.isFinite(p) && p >= 0) return p;
  }
  const g = Number(settingsExpiryNotifyDays);
  return Number.isFinite(g) && g >= 0 ? g : 14;
}

module.exports = {
  computeDaysLeft,
  computeExpiryAlertLevel,
  resolveNotifyDays,
  countExpiringAlerts,
};
