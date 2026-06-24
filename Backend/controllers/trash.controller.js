const asyncHandler = require('../middlewares/asyncHandler');
const AppError = require('../utils/AppError');
const { TRASH_ENTITIES } = require('../config/trashEntities');

/** Newest soft-deletes first; fall back when deletedAt was not set on older records. */
const TRASH_DELETED_SORT = {
  deletedAt: -1,
  updatedAt: -1,
  createdAt: -1,
  _id: -1,
};

function getDeletedSortTime(item) {
  const d = item?.deletedAt || item?.updatedAt || item?.createdAt;
  return d ? new Date(d).getTime() : 0;
}

function pickContactPhone(entity) {
  return entity?.contact_info?.phone || entity?.contactNumber || null;
}

function resolveTrashRecordDate(type, item) {
  switch (type) {
    case 'purchase':
      return item.purchaseDate || item.createdAt;
    case 'sale':
      return item.saleDate || item.createdAt;
    case 'expense':
    case 'income':
      return item.date || item.createdAt;
    case 'employee':
      return item.hire_date || item.createdAt;
    default:
      return item.createdAt;
  }
}

function resolveTrashSummary(type, item) {
  const parts = [];

  switch (type) {
    case 'product':
      if (item.baseUnit?.name) parts.push(`واحد: ${item.baseUnit.name}`);
      if (item.latestPurchasePrice != null) {
        parts.push(`بیه: ${item.latestPurchasePrice}`);
      }
      if (item.description) parts.push(item.description);
      break;
    case 'purchase':
      if (item.supplierName || item.supplier?.name) {
        parts.push(`عرضه کوونکی: ${item.supplierName || item.supplier.name}`);
      }
      if (item.totalAmount != null) parts.push(`ټول: ${item.totalAmount}`);
      if (item.dueAmount > 0) parts.push(`پاتې: ${item.dueAmount}`);
      break;
    case 'sale':
      if (item.customerName || item.customer?.name) {
        parts.push(`مشتري: ${item.customerName || item.customer?.name}`);
      }
      if (item.totalAmount != null) parts.push(`ټول: ${item.totalAmount}`);
      if (item.dueAmount > 0) parts.push(`پاتې: ${item.dueAmount}`);
      if (item.discountAmount > 0) parts.push(`تخفیف: ${item.discountAmount}`);
      break;
    case 'expense':
      if (item.category?.name) parts.push(`کټګوري: ${item.category.name}`);
      if (item.amount != null) parts.push(`اندازه: ${item.amount}`);
      if (item.description) parts.push(item.description);
      break;
    case 'income':
      if (item.category?.name) parts.push(`کټګوري: ${item.category.name}`);
      if (item.amount != null) parts.push(`اندازه: ${item.amount}`);
      if (item.source && item.source !== item.name) parts.push(item.source);
      if (item.description) parts.push(item.description);
      break;
    case 'account':
      if (item.type) parts.push(`ډول: ${item.type}`);
      if (item.currentBalance != null) {
        parts.push(`بیلانس: ${item.currentBalance}`);
      }
      break;
    case 'customer':
    case 'supplier':
    case 'saraf': {
      const phone = pickContactPhone(item);
      if (phone) parts.push(`تلیفون: ${phone}`);
      const email = item.contact_info?.email || item.email;
      if (email) parts.push(email);
      break;
    }
    case 'category':
      if (item.type) parts.push(`ډول: ${item.type}`);
      if (item.description) parts.push(item.description);
      break;
    case 'employee':
      if (item.role) parts.push(`رول: ${item.role}`);
      if (pickContactPhone(item)) parts.push(`تلیفون: ${pickContactPhone(item)}`);
      break;
    case 'company':
      if (item.contactNumber) parts.push(`تلیفون: ${item.contactNumber}`);
      if (item.address) parts.push(item.address);
      break;
    case 'brand':
      if (item.description) parts.push(item.description);
      break;
    case 'type':
      if (item.description) parts.push(String(item.description));
      break;
    default:
      break;
  }

  return parts.length ? parts.join(' · ') : null;
}

function resolveTrashDisplayName(type, config, item) {
  const fieldKeys = [
    ...(config.nameFields || []),
    ...(config.nameField ? [config.nameField] : []),
    'name',
    'billNumber',
    'invoiceNumber',
    'supplierName',
    'customerName',
    'description',
    'source',
    'batchNumber',
  ];

  for (const key of fieldKeys) {
    const value = item[key];
    if (value != null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }

  if (item.product?.name) return item.product.name;
  if (item.supplier?.name) return item.supplier.name;
  if (item.customer?.name) return item.customer.name;
  if (item.category?.name) return item.category.name;
  if (item.employee?.name) return item.employee.name;

  if (item.amount != null && Number.isFinite(Number(item.amount))) {
    return String(item.amount);
  }

  return null;
}

function mapTrashItem(type, config, item) {
  const name = resolveTrashDisplayName(type, config, item);
  const deletedByRef = item.deletedBy;

  return {
    _id: item._id,
    type,
    label: config.label,
    name: name || '—',
    summary: resolveTrashSummary(type, item),
    recordDate: resolveTrashRecordDate(type, item),
    deletedAt: item.deletedAt || item.updatedAt || item.createdAt,
    deletedBy: deletedByRef?._id || deletedByRef || null,
    deletedByName:
      deletedByRef?.name || deletedByRef?.email || null,
    item,
  };
}

function applyTrashPopulate(query, config) {
  const paths = new Set((config.populate || []).map((p) => p.path || p));
  (config.populate || []).forEach((p) => {
    query = query.populate(p);
  });
  if (!paths.has('deletedBy')) {
    query = query.populate({ path: 'deletedBy', select: 'name email' });
  }
  return query;
}

async function fetchTrashByType(type, page, limit) {
  const config = TRASH_ENTITIES[type];
  const skip = (page - 1) * limit;
  const filter = { isDeleted: true };

  let query = config.model
    .find(filter)
    .sort(TRASH_DELETED_SORT);
  query = applyTrashPopulate(query, config);

  const [items, total] = await Promise.all([
    query.skip(skip).limit(limit).lean(),
    config.model.countDocuments(filter),
  ]);

  return {
    success: true,
    type,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
    data: items.map((item) => mapTrashItem(type, config, item)),
  };
}

async function fetchAllTrashItems(page, limit) {
  const skip = (page - 1) * limit;
  const entries = Object.entries(TRASH_ENTITIES);

  const chunks = await Promise.all(
    entries.map(async ([type, config]) => {
      const stubs = await config.model
        .find({ isDeleted: true })
        .select('_id deletedAt updatedAt createdAt')
        .lean();
      return stubs.map((stub) => ({ type, config, stub }));
    })
  );

  const flat = chunks.flat();
  flat.sort((a, b) => getDeletedSortTime(b.stub) - getDeletedSortTime(a.stub));

  const total = flat.length;
  const slice = flat.slice(skip, skip + limit);

  const data = (
    await Promise.all(
      slice.map(async ({ type, config, stub }) => {
        let query = config.model.findById(stub._id);
        query = applyTrashPopulate(query, config);
        const item = await query.lean();
        if (!item || !item.isDeleted) return null;
        return mapTrashItem(type, config, item);
      })
    )
  ).filter(Boolean);

  return {
    success: true,
    type: 'all',
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
    data,
  };
}

const getTrashSummary = asyncHandler(async (req, res) => {
  const counts = await Promise.all(
    Object.entries(TRASH_ENTITIES).map(async ([type, config]) => {
      const count = await config.model.countDocuments({ isDeleted: true });
      return { type, label: config.label, count };
    })
  );

  const total = counts.reduce((sum, row) => sum + row.count, 0);

  res.status(200).json({
    success: true,
    total,
    data: counts,
  });
});

const getTrashItems = asyncHandler(async (req, res) => {
  const { type } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  if (!type || type === 'all') {
    const result = await fetchAllTrashItems(page, limit);
    return res.status(200).json(result);
  }

  if (!TRASH_ENTITIES[type]) {
    throw new AppError('د کثافاتو ډول ناسم دی', 400);
  }

  const result = await fetchTrashByType(type, page, limit);
  res.status(200).json(result);
});

module.exports = {
  getTrashSummary,
  getTrashItems,
};
