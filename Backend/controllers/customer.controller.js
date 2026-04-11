const Customer = require('../models/customer.model');
const asyncHandler = require('../middlewares/asyncHandler');
const AppError = require('../utils/AppError');

// @desc    Create new customer
// @route   POST /api/v1/customers
// @access  Private/Admin
const createCustomer = asyncHandler(async (req, res, next) => {
  const { name, contact_info } = req.body;

  const customerExists = await Customer.findOne({ name, isDeleted: false });
  if (customerExists) {
    throw new AppError('Customer with this name already exists', 400);
  }

  const customer = await Customer.create({ name, contact_info });

  res.status(201).json({
    status: 'success',
    data: customer,
  });
});

// @desc    Get all customers (with pagination)
// @route   GET /api/v1/customers
// @access  Private/Admin
const getAllCustomers = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const customers = await Customer.find({ isDeleted: false })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const totalCustomers = await Customer.countDocuments({ isDeleted: false });

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
// @access  Private/Admin
const getCustomer = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  res.status(200).json({
    status: 'success',
    data: customer,
  });
});

// @desc    Update customer
// @route   PATCH /api/v1/customers/:id
// @access  Private/Admin
const updateCustomer = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    req.body,
    { new: true, runValidators: true }
  );

  if (!customer) {
    throw new AppError('Customer not found or already deleted', 404);
  }

  res.status(200).json({
    status: 'success',
    data: customer,
  });
});

// @desc    Soft delete customer
// @route   DELETE /api/v1/customers/:id
// @access  Private/Admin
const deleteCustomer = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { isDeleted: true },
    { new: true }
  );

  if (!customer) {
    throw new AppError('Customer not found or already deleted', 404);
  }

  res.status(200).json({
    status: 'success',
    message: 'Customer deleted successfully (soft delete applied)',
  });
});

module.exports = {
  createCustomer,
  getAllCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
};
