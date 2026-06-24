/**
 * Stock alert level aligned with Backend/controllers/stock.controller.js (getStockReport).
 * Returns: 'normal' | 'low' | 'critical' | 'out'
 */
export const computeInventoryStockLevel = (quantity, minLevel) => {
  const q = Number(quantity);
  const m = Number(minLevel) || 0;

  if (!Number.isFinite(q) || q < 0) return 'normal';
  if (q === 0) return 'out';

  // Only alert when a minimum level is configured (minLevel > 0)
  if (m > 0) {
    const difference = q - m;
    if (difference <= 0) {
      return q <= m * 0.5 ? 'critical' : 'low';
    }
  }
  return 'normal';
};

/** Days until expiry (local calendar). Negative = expired. */
export const computeDaysLeft = (expiryDate) => {
  if (!expiryDate) return null;
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((exp - today) / (24 * 60 * 60 * 1000));
};

/**
 * Expiry alert level — mirrors computeInventoryStockLevel (daysLeft vs notifyDays).
 * @returns {'normal' | 'low' | 'critical' | 'out'}
 */
export const computeExpiryAlertLevel = (daysLeft, notifyDays) => {
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
};

export const resolveNotifyDays = (productNotifyDaysBefore, settingsExpiryNotifyDays) => {
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
};

// Utility function to calculate stock status based on quantity and minimum level
export const getStockStatus = (quantity, minLevel) => {
  if (quantity <= 0) {
    return {
      status: 'out_of_stock',
      label: 'تمام شده',
      color: 'bg-red-100 text-red-800 border border-red-200'
    };
  } else if (minLevel > 0 && quantity <= minLevel) {
    return {
      status: 'low_stock',
      label: 'کمبود موجودی',
      color: 'bg-yellow-100 text-yellow-800 border border-yellow-200'
    };
  } else {
    return {
      status: 'available',
      label: 'موجود',
      color: 'bg-green-100 text-green-800 border border-green-200'
    };
  }
};

// Utility function to get status color class
export const getStatusColor = (status) => {
  switch (status) {
    case 'available':
      return 'bg-green-100 text-green-800 border border-green-200';
    case 'low_stock':
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    case 'out_of_stock':
      return 'bg-red-100 text-red-800 border border-red-200';
    case 'critical':
      return 'bg-orange-100 text-orange-800 border border-orange-200';
    case 'low':
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    case 'out':
      return 'bg-red-100 text-red-800 border border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-200';
  }
};
