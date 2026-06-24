import { formatJalaliDate } from './helper';

/** Internal / audit metadata — hide from user-facing detail tables */
export const AUDIT_HIDDEN_FIELDS = new Set([
  '_id',
  '__v',
  'isDeleted',
  'deletedAt',
  'deletedBy',
  'restoredAt',
  'createdAt',
  'updatedAt',
  'created_by',
  'updated_by',
  'password',
  'refreshToken',
]);

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const valuesEqual = (a, b) => {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (typeof a === 'object' || typeof b === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return String(a) === String(b);
};

/** Keep only user-meaningful fields for display */
export const filterAuditFields = (data) => {
  if (!data || !isPlainObject(data)) return {};
  const filtered = {};
  Object.entries(data).forEach(([key, value]) => {
    if (AUDIT_HIDDEN_FIELDS.has(key)) return;
    if (key.toLowerCase().endsWith('id') && key !== 'source') return;
    filtered[key] = value;
  });
  return filtered;
};

/** Fields that changed between old and new (UPDATE / RESTORE compare) */
export const getChangedAuditFields = (oldData, newData) => {
  const oldFiltered = filterAuditFields(oldData);
  const newFiltered = filterAuditFields(newData);
  const keys = new Set([
    ...Object.keys(oldFiltered),
    ...Object.keys(newFiltered),
  ]);

  const changed = [];
  keys.forEach((key) => {
    if (!valuesEqual(oldFiltered[key], newFiltered[key])) {
      changed.push(key);
    }
  });

  return changed.sort();
};

export const pickAuditFields = (data, keys) => {
  const filtered = filterAuditFields(data);
  const picked = {};
  keys.forEach((key) => {
    if (key in filtered) picked[key] = filtered[key];
  });
  return picked;
};

const ISO_DATE_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;

export const formatAuditScalar = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  if (typeof value === 'string' && ISO_DATE_RE.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return formatJalaliDate(d);
    }
  }
  return String(value);
};

export const getAuditDisplayEntries = (data) =>
  Object.entries(filterAuditFields(data)).sort(([a], [b]) =>
    a.localeCompare(b)
  );
