const Product = require('../models/product.model');
const Purchase = require('../models/purchase.model');
const Sale = require('../models/sale.model');
const Expense = require('../models/expense.model');
const Income = require('../models/income.model');
const Account = require('../models/account.model');
const Customer = require('../models/customer.model');
const Supplier = require('../models/supplier.model');
const Category = require('../models/category.model');
const Brand = require('../models/brand.model');
const Employee = require('../models/employee.model');
const Company = require('../models/company.model');
const Type = require('../models/type.model');
const Saraf = require('../models/saraf.model');
const TRASH_ENTITIES = {
  product: {
    model: Product,
    label: 'محصول',
    nameField: 'name',
    sort: { deletedAt: -1 },
    populate: [{ path: 'baseUnit', select: 'name' }],
  },
  purchase: {
    model: Purchase,
    label: 'رانیول',
    nameFields: ['supplierName'],
    sort: { deletedAt: -1 },
    populate: [{ path: 'supplier', select: 'name' }],
  },
  sale: {
    model: Sale,
    label: 'پلور',
    nameFields: ['billNumber', 'customerName'],
    sort: { deletedAt: -1 },
    populate: [{ path: 'customer', select: 'name' }],
  },
  expense: {
    model: Expense,
    label: 'لګښت',
    nameField: 'description',
    sort: { deletedAt: -1 },
    populate: [{ path: 'category', select: 'name' }],
  },
  income: {
    model: Income,
    label: 'عاید',
    nameField: 'source',
    sort: { deletedAt: -1 },
    populate: [{ path: 'category', select: 'name' }],
  },
  account: {
    model: Account,
    label: 'حساب',
    nameField: 'name',
    sort: { deletedAt: -1 },
  },
  customer: {
    model: Customer,
    label: 'پیرودونکی',
    nameField: 'name',
    sort: { deletedAt: -1 },
  },
  supplier: {
    model: Supplier,
    label: 'عرضه کوونکی',
    nameField: 'name',
    sort: { deletedAt: -1 },
  },
  category: {
    model: Category,
    label: 'کېټګورۍ',
    nameField: 'name',
    sort: { deletedAt: -1 },
  },
  brand: {
    model: Brand,
    label: 'برانډ',
    nameField: 'name',
    sort: { deletedAt: -1 },
  },
  employee: {
    model: Employee,
    label: 'کارکوونکی',
    nameField: 'name',
    sort: { deletedAt: -1 },
  },
  company: {
    model: Company,
    label: 'شرکت',
    nameField: 'name',
    sort: { deletedAt: -1 },
  },
  type: {
    model: Type,
    label: 'ډول',
    nameField: 'name',
    sort: { deletedAt: -1 },
  },
  saraf: {
    model: Saraf,
    label: 'صراف',
    nameField: 'name',
    sort: { deletedAt: -1 },
  },
};

module.exports = { TRASH_ENTITIES };
