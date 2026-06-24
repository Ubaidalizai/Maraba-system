const Employee = require('../models/employee.model');
const asyncHandler = require('../middlewares/asyncHandler');
const AppError = require('../utils/AppError');
const {
  parseDeletionFilter,
  softDeleteUpdate,
  createSimpleRestoreHandler,
  createPermanentDeleteHandler,
} = require('../utils/softDeleteHelpers');

// @desc    Create new employee
// @route   POST /api/v1/employees
// @access  Private/Admin
const createEmployee = asyncHandler(async (req, res, next) => {
  const { name, role, contact_info, hire_date } = req.body;

  const employee = await Employee.create({
    name,
    role,
    contact_info,
    hire_date: hire_date || Date.now(),
  });

  res.status(201).json({
    status: 'success',
    data: employee,
  });
});

// @desc    Get all employees (with pagination)
// @route   GET /api/v1/employees
// @access  Private/Admin
const getAllEmployees = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = parseDeletionFilter(req.query);

  const employees = await Employee.find(filter)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const totalEmployees = await Employee.countDocuments(filter);

  res.status(200).json({
    status: 'success',
    results: employees.length,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalEmployees / limit),
      totalEmployees,
    },
    data: employees,
  });
});

// @desc    Get single employee
// @route   GET /api/v1/employees/:id
// @access  Private/Admin
const getEmployee = asyncHandler(async (req, res, next) => {
  const employee = await Employee.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!employee) {
    throw new AppError('کارکوونکی ونه موندل شو', 404);
  }

  res.status(200).json({
    status: 'success',
    data: employee,
  });
});

// @desc    Update employee
// @route   PATCH /api/v1/employees/:id
// @access  Private/Admin
const updateEmployee = asyncHandler(async (req, res, next) => {
  const employee = await Employee.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    req.body,
    { new: true, runValidators: true }
  );

  if (!employee) {
    throw new AppError('کارکوونکی ونه موندل شو یا دمخه ړنګ شوی دی', 404);
  }

  res.status(200).json({
    status: 'success',
    data: employee,
  });
});

// @desc    Soft delete employee
// @route   DELETE /api/v1/employees/:id
// @access  Private/Admin
const deleteEmployee = asyncHandler(async (req, res, next) => {
  const employee = await Employee.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    softDeleteUpdate(req.user?._id, { is_active: false }),
    { new: true }
  );

  if (!employee) {
    throw new AppError('کارکوونکی ونه موندل شو یا دمخه ړنګ شوی دی', 404);
  }

  res.status(200).json({
    status: 'success',
    message: 'کارکوونکی په بریالیتوب سره حذف شو',
  });
});

const restoreEmployee = createSimpleRestoreHandler(Employee, {
  notFoundMessage: 'کارکوونکی ونه موندل شو',
  notDeletedMessage: 'کارکوونکی حذف شوی نه دی',
  successMessage: 'کارکوونکی په بریالیتوب سره بیرته راستون شو',
  onBeforeSave: (doc) => {
    doc.is_active = true;
  },
});

const permanentDeleteEmployee = createPermanentDeleteHandler(Employee, {
  notFoundMessage: 'کارکوونکی ونه موندل شو',
  notInTrashMessage: 'لومړی باید کارکوونکی په کثافاتو کې حذف شوی وي',
  successMessage: 'کارکوونکی په تل لپاره حذف شو',
});

module.exports = {
  createEmployee,
  getAllEmployees,
  getEmployee,
  updateEmployee,
  deleteEmployee,
  restoreEmployee,
  permanentDeleteEmployee,
};
