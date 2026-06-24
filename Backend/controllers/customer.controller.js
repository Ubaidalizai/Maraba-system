const Customer = require('../models/customer.model');
const asyncHandler = require('../middlewares/asyncHandler');
const AppError = require('../utils/AppError');
const {
  parseDeletionFilter,
  softDeleteUpdate,
  createSimpleRestoreHandler,
  createPermanentDeleteHandler,
} = require('../utils/softDeleteHelpers');

// @desc    Create new customer
// @route   POST /api/v1/customers
const createCustomer = asyncHandler(async (req, res, next) => {
  const { name, contact_info } = req.body;

  const customerExists = await Customer.findOne({ name, isDeleted: false });
  if (customerExists) {
    throw new AppError('د دې نوم سره پیرودونکی دمخه شتون لري', 400);
  }

  const customer = await Customer.create({ name, contact_info });

  res.status(201).json({
    status: 'success',
    data: customer,
  });
});

// @desc    Get all customers (with pagination)
// @route   GET /api/v1/customers
const getAllCustomers = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = parseDeletionFilter(req.query);

  const customers = await Customer.find(filter)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const totalCustomers = await Customer.countDocuments(filter);

  res.status(200).json({
    status: 'success',
    results: customers.length,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalCustomers / limit),
      totalCustomers,
    },
    data: customers,
  });
});

// @desc    Get single customer
// @route   GET /api/v1/customers/:id
const getCustomer = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!customer) {
    throw new AppError('پیرودونکی ونه موندل شو', 404);
  }

  res.status(200).json({
    status: 'success',
    data: customer,
  });
});

// @desc    Update customer
// @route   PATCH /api/v1/customers/:id
const updateCustomer = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    req.body,
    { new: true, runValidators: true }
  );

  if (!customer) {
    throw new AppError('پیرودونکی ونه موندل شو یا دمخه ړنګ شوی دی', 404);
  }

  res.status(200).json({
    status: 'success',
    data: customer,
  });
});

// @desc    Soft delete customer
// @route   DELETE /api/v1/customers/:id
const deleteCustomer = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    softDeleteUpdate(req.user?._id),
    { new: true }
  );

  if (!customer) {
    throw new AppError('پیرودونکی ونه موندل شو یا دمخه ړنګ شوی دی', 404);
  }

  res.status(200).json({
    status: 'success',
    message: 'پیرودونکی په بریالیتوب سره حذف شو',
  });
});

const restoreCustomer = createSimpleRestoreHandler(Customer, {
  notFoundMessage: 'پیرودونکی ونه موندل شو',
  notDeletedMessage: 'پیرودونکی حذف شوی نه دی',
  successMessage: 'پیرودونکی په بریالیتوب سره بیرته راستون شو',
});

const permanentDeleteCustomer = createPermanentDeleteHandler(Customer, {
  notFoundMessage: 'پیرودونکی ونه موندل شو',
  notInTrashMessage: 'لومړی باید پیرودونکی په کثافاتو کې حذف شوی وي',
  successMessage: 'پیرودونکی په تل لپاره حذف شو',
});

module.exports = {
  createCustomer,
  getAllCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  restoreCustomer,
  permanentDeleteCustomer,
};
