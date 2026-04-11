const Company = require("../models/company.model.js");
const asyncHandler = require("../middlewares/asyncHandler.js");
const AppError = require("../utils/appError.js");

// @desc    Create new company
// @route   POST /api/v1/companies
// @access  Private/Admin
const createCompany = asyncHandler(async (req, res, next) => {
  const { name, address, contactNumber, email } = req.body;

  const companyExists = await Company.findOne({ name, isDeleted: false });
  if (companyExists) {
    throw new AppError("Company with this name already exists", 400);
  }

  const company = await Company.create({ name, address, contactNumber, email });

  res.status(201).json({
    status: "success",
    data: company,
  });
});

// @desc    Get all companies (with pagination)
// @route   GET /api/v1/companies
// @access  Private/Admin
const getAllCompanies = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const companies = await Company.find({ isDeleted: false })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const totalCompanies = await Company.countDocuments({ isDeleted: false });

  res.status(200).json({
    status: "success",
    results: companies.length,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalCompanies / limit),
      totalCompanies,
    },
    data: companies,
  });
});

// @desc    Get single company
// @route   GET /api/v1/companies/:id
// @access  Private/Admin
const getCompany = asyncHandler(async (req, res, next) => {
  const company = await Company.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!company) {
    throw new AppError("Company not found", 404);
  }

  res.status(200).json({
    status: "success",
    data: company,
  });
});

// @desc    Update company
// @route   PATCH /api/v1/companies/:id
// @access  Private/Admin
const updateCompany = asyncHandler(async (req, res, next) => {
  const company = await Company.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    req.body,
    { new: true, runValidators: true },
  );

  if (!company) {
    throw new AppError("Company not found or already deleted", 404);
  }

  res.status(200).json({
    status: "success",
    data: company,
  });
});

// @desc    Soft delete company
// @route   DELETE /api/v1/companies/:id
// @access  Private/Admin
const deleteCompany = asyncHandler(async (req, res, next) => {
  const company = await Company.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { isDeleted: true },
    { new: true },
  );

  if (!company) {
    throw new AppError("Company not found or already deleted", 404);
  }

  res.status(200).json({
    status: "success",
    message: "Company deleted successfully (soft delete applied)",
  });
});

module.exports = {
  createCompany,
  getAllCompanies,
  getCompany,
  updateCompany,
  deleteCompany,
};
