const mongoose = require('mongoose');

const Category = require('../models/category.model');
const Account = require('../models/account.model');
const User = require('../models/user.model');
const Product = require('../models/product.model');
const Supplier = require('../models/supplier.model');
const Customer = require('../models/customer.model');
const Employee = require('../models/employee.model');
const Unit = require('../models/unit.model');
const Brand = require('../models/brand.model');
const Purchase = require('../models/purchase.model');
const Sale = require('../models/sale.model');

/** Fields that hold ObjectId refs → model + display field */
const REF_FIELD_RESOLVERS = {
  category: { Model: Category, display: 'name' },
  placedInAccount: { Model: Account, display: 'name' },
  account: { Model: Account, display: 'name' },
  placedIn: { Model: Account, display: 'name' },
  supplierAccount: { Model: Account, display: 'name' },
  customerAccount: { Model: Account, display: 'name' },
  employeeAccount: { Model: Account, display: 'name' },
  cashRefundAccount: { Model: Account, display: 'name' },
  createdBy: { Model: User, display: 'name' },
  deletedBy: { Model: User, display: 'name' },
  handledBy: { Model: User, display: 'name' },
  product: { Model: Product, display: 'name' },
  supplier: { Model: Supplier, display: 'name' },
  customer: { Model: Customer, display: 'name' },
  employee: { Model: Employee, display: 'name' },
  unit: { Model: Unit, display: 'name' },
  brand: { Model: Brand, display: 'name' },
  purchase: { Model: Purchase, display: 'supplierName' },
  sale: { Model: Sale, display: 'billNumber' },
  purchaseItem: { Model: null, display: null },
  baseUnit: { Model: Unit, display: 'name' },
};

const isObjectIdString = (value) =>
  typeof value === 'string' && mongoose.Types.ObjectId.isValid(value);

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const collectRefIds = (value, bucket) => {
  if (value === null || value === undefined) return;

  if (Array.isArray(value)) {
    value.forEach((item) => collectRefIds(item, bucket));
    return;
  }

  if (!isPlainObject(value)) return;

  for (const [key, fieldValue] of Object.entries(value)) {
    const resolver = REF_FIELD_RESOLVERS[key];
    if (resolver?.Model && isObjectIdString(fieldValue)) {
      const modelName = resolver.Model.modelName;
      if (!bucket[modelName]) bucket[modelName] = new Set();
      bucket[modelName].add(fieldValue);
    } else if (isPlainObject(fieldValue) || Array.isArray(fieldValue)) {
      collectRefIds(fieldValue, bucket);
    }
  }
};

const MODEL_LOOKUP = {
  Category: { Model: Category, pick: (doc) => doc.name },
  Account: { Model: Account, pick: (doc) => doc.name },
  User: { Model: User, pick: (doc) => doc.name },
  Product: { Model: Product, pick: (doc) => doc.name },
  Supplier: { Model: Supplier, pick: (doc) => doc.name },
  Customer: { Model: Customer, pick: (doc) => doc.name },
  Employee: { Model: Employee, pick: (doc) => doc.name },
  Unit: { Model: Unit, pick: (doc) => doc.name },
  Brand: { Model: Brand, pick: (doc) => doc.name },
  Purchase: {
    Model: Purchase,
    pick: (doc) => doc.supplierName || doc.description || String(doc._id),
  },
  Sale: {
    Model: Sale,
    pick: (doc) => doc.billNumber || String(doc._id),
  },
};

const loadLookupMaps = async (bucket) => {
  const maps = {};

  await Promise.all(
    Object.entries(bucket).map(async ([modelName, idSet]) => {
      const config = MODEL_LOOKUP[modelName];
      if (!config) return;

      const ids = [...idSet];
      if (!ids.length) return;

      const docs = await config.Model.find({ _id: { $in: ids } }).lean();
      maps[modelName] = Object.fromEntries(
        docs.map((doc) => [String(doc._id), config.pick(doc) || String(doc._id)])
      );
    })
  );

  return maps;
};

const resolveValue = (key, value, lookupMaps) => {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map((item) => resolveValue(key, item, lookupMaps));
  }

  if (isPlainObject(value)) {
    const nested = {};
    for (const [nestedKey, nestedVal] of Object.entries(value)) {
      nested[nestedKey] = resolveValue(nestedKey, nestedVal, lookupMaps);
    }
    return nested;
  }

  const resolver = REF_FIELD_RESOLVERS[key];
  if (resolver?.Model && isObjectIdString(value)) {
    const label = lookupMaps[resolver.Model.modelName]?.[value];
    return label || value;
  }

  return value;
};

const enrichDataBlock = (data, lookupMaps) => {
  if (!data || !isPlainObject(data)) return data;
  const enriched = {};
  for (const [key, value] of Object.entries(data)) {
    enriched[key] = resolveValue(key, value, lookupMaps);
  }
  return enriched;
};

const enrichAuditLog = async (log) => {
  if (!log) return log;

  const bucket = {};
  collectRefIds(log.oldData, bucket);
  collectRefIds(log.newData, bucket);
  const lookupMaps = await loadLookupMaps(bucket);

  return {
    ...log,
    oldData: log.oldData
      ? enrichDataBlock(log.oldData, lookupMaps)
      : log.oldData,
    newData: log.newData
      ? enrichDataBlock(log.newData, lookupMaps)
      : log.newData,
  };
};

const enrichAuditLogs = async (logs) => {
  if (!Array.isArray(logs) || logs.length === 0) return logs;

  const bucket = {};
  logs.forEach((log) => {
    collectRefIds(log.oldData, bucket);
    collectRefIds(log.newData, bucket);
  });

  const lookupMaps = await loadLookupMaps(bucket);

  return logs.map((log) => ({
    ...log,
    oldData: log.oldData
      ? enrichDataBlock(log.oldData, lookupMaps)
      : log.oldData,
    newData: log.newData
      ? enrichDataBlock(log.newData, lookupMaps)
      : log.newData,
  }));
};

module.exports = {
  enrichAuditLog,
  enrichAuditLogs,
};
