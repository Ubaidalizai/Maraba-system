/**
 * Inclusive local-day bounds for YYYY-MM-DD (or Date) filters.
 */
function parseRangeStart(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function parseRangeEnd(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d, 23, 59, 59, 999);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(23, 59, 59, 999);
  return date;
}

/** Normalize sale date from API (date-only string → midday local to avoid TZ shift). */
function normalizeSaleDateInput(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildSaleDateFilter(fromDate, toDate) {
  const filter = {};
  const start = parseRangeStart(fromDate);
  const end = parseRangeEnd(toDate);
  if (start) filter.$gte = start;
  if (end) filter.$lte = end;
  return Object.keys(filter).length ? filter : null;
}

module.exports = {
  parseRangeStart,
  parseRangeEnd,
  normalizeSaleDateInput,
  buildSaleDateFilter,
};
