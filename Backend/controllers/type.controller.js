const Type = require("../models/type.model.js");
const asyncHandler = require("../middlewares/asyncHandler.js");
const AppError = require("../utils/appError.js");

// @desc    Create new type
// @route   POST /api/v1/type
// @access  Private/Admin
const createType = asyncHandler(async (req, res, next) => {
  const { name, address, contactNumber, email } = req.body;

  const typeExists = await Type.findOne({ name, isDeleted: false });
  if (typeExists) {
    throw new AppError("Type with this name already exists", 400);
  }

  const type = await Type.create({ name, address, contactNumber, email });

  res.status(201).json({
    status: "success",
    data: type,
  });
});

// @desc    Get all types (with pagination)
// @route   GET /api/v1/type
// @access  Private/Admin
const getAllTypes = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const types = await Type.find({ isDeleted: false })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const totalTypes = await Type.countDocuments({ isDeleted: false });

  res.status(200).json({
    status: "success",
    results: types.length,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalTypes / limit),
      totalTypes,
    },
    data: types,
  });
});

// @desc    Get single type
// @route   GET /api/v1/type/:id
// @access  Private/Admin
const getType = asyncHandler(async (req, res, next) => {
  const type = await Type.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!type) {
    throw new AppError("Type not found", 404);
  }

  res.status(200).json({
    status: "success",
    data: type,
  });
});

// @desc    Update type
// @route   PATCH /api/v1/type/:id
// @access  Private/Admin
const updateType = asyncHandler(async (req, res, next) => {
  const type = await Type.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    req.body,
    { new: true, runValidators: true },
  );

  if (!type) {
    throw new AppError("Type not found or already deleted", 404);
  }

  res.status(200).json({
    status: "success",
    data: type,
  });
});

// @desc    Soft delete type
// @route   DELETE /api/v1/type/:id
// @access  Private/Admin
const deleteType = asyncHandler(async (req, res, next) => {
  const type = await Type.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { isDeleted: true },
    { new: true },
  );

  if (!type) {
    throw new AppError("Type not found or already deleted", 404);
  }

  res.status(200).json({
    status: "success",
    message: "Type deleted successfully (soft delete applied)",
  });
});

module.exports = {
  createType,
  getAllTypes,
  getType,
  updateType,
  deleteType,
};
