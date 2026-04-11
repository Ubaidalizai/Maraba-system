const Employee = require('../models/employee.model');
const asyncHandler = require('../middlewares/asyncHandler');
const AppError = require('../utils/AppError');

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

  const employees = await Employee.find({ isDeleted: false })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const totalEmployees = await Employee.countDocuments({ isDeleted: false });

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
    throw new AppError('Employee not found', 404);
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
    throw new AppError('Employee not found or already deleted', 404);
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
    { isDeleted: true, is_active: false },
    { new: true }
  );

  if (!employee) {
    throw new AppError('Employee not found or already deleted', 404);
  }

  res.status(200).json({
    status: 'success',
    message: 'Employee deleted successfully (soft delete applied)',
  });
});

module.exports = {
  createEmployee,
  getAllEmployees,
  getEmployee,
  updateEmployee,
  deleteEmployee,
};
