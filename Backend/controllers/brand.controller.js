const Brand = require("../models/brand.model.js");
const asyncHandler = require("../middlewares/asyncHandler.js");
const AppError = require("../utils/appError.js");

// @desc    Create new brand
// @route   POST /api/v1/brand
// @access  Private/Admin
const createBrand = asyncHandler(async (req, res, next) => {
  const { name, address, contactNumber, email } = req.body;

  const typeExists = await Brand.findOne({ name, isDeleted: false });
  if (typeExists) {
    throw new AppError("Brand with this name already exists", 400);
  }

  const brand = await Brand.create({ name, address, contactNumber, email });

  res.status(201).json({
    status: "success",
    data: brand,
  });
});

// @desc    Get all types (with pagination)
// @route   GET /api/v1/brand
// @access  Private/Admin
const getAllBrands = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const types = await Brand.find({ isDeleted: false })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const totalBrands = await Brand.countDocuments({ isDeleted: false });

  res.status(200).json({
    status: "success",
    results: types.length,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalBrands / limit),
      totalBrands,
    },
    data: types,
  });
});

// @desc    Get single brand
// @route   GET /api/v1/brand/:id
// @access  Private/Admin
const getBrand = asyncHandler(async (req, res, next) => {
  const brand = await Brand.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!brand) {
    throw new AppError("Brand not found", 404);
  }

  res.status(200).json({
    status: "success",
    data: brand,
  });
});

// @desc    Update brand
// @route   PATCH /api/v1/brand/:id
// @access  Private/Admin
const updateBrand = asyncHandler(async (req, res, next) => {
  const brand = await Brand.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    req.body,
    { new: true, runValidators: true },
  );

  if (!brand) {
    throw new AppError("Brand not found or already deleted", 404);
  }

  res.status(200).json({
    status: "success",
    data: brand,
  });
});

// @desc    Soft delete brand
// @route   DELETE /api/v1/brand/:id
// @access  Private/Admin
const deleteBrand = asyncHandler(async (req, res, next) => {
  const brand = await Brand.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { isDeleted: true },
    { new: true },
  );

  if (!brand) {
    throw new AppError("Brand not found or already deleted", 404);
  }

  res.status(200).json({
    status: "success",
    message: "Brand deleted successfully (soft delete applied)",
  });
});

module.exports = {
  createBrand,
  getAllBrands,
  getBrand,
  updateBrand,
  deleteBrand,
};
