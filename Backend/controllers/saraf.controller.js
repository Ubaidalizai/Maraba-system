const Saraf = require('../models/saraf.model');
const asyncHandler = require('../middlewares/asyncHandler');
const AppError = require('../utils/appError');

// @desc    Create new saraf
// @route   POST /api/v1/sarafs
// @access  Private/Admin
const createSaraf = asyncHandler(async (req, res, next) => {
  const { name, contact_info } = req.body;

  const sarafExists = await Saraf.findOne({ name, isDeleted: false });
  if (sarafExists) {
    throw new AppError('د دې نوم سره صراف دمخه شتون لري', 400);
  }

  const saraf = await Saraf.create({ name, contact_info });

  res.status(201).json({
    status: 'success',
    data: saraf,
  });
});

// @desc    Get all sarafs (with pagination)
// @route   GET /api/v1/sarafs
// @access  Private/Admin
const getAllSarafs = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const sarafs = await Saraf.find({ isDeleted: false })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const totalSarafs = await Saraf.countDocuments({ isDeleted: false });

  res.status(200).json({
    status: 'success',
    results: sarafs.length,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalSarafs / limit),
      totalSarafs,
    },
    data: sarafs,
  });
});

// @desc    Get single saraf
// @route   GET /api/v1/sarafs/:id
// @access  Private/Admin
const getSaraf = asyncHandler(async (req, res, next) => {
  const saraf = await Saraf.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!saraf) {
    throw new AppError('صراف ونه موندل شو', 404);
  }

  res.status(200).json({
    status: 'success',
    data: saraf,
  });
});

// @desc    Update saraf
// @route   PATCH /api/v1/sarafs/:id
// @access  Private/Admin
const updateSaraf = asyncHandler(async (req, res, next) => {
  const saraf = await Saraf.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    req.body,
    { new: true, runValidators: true }
  );

  if (!saraf) {
    throw new AppError('صراف ونه موندل شو یا دمخه حذف شوی دی', 404);
  }

  res.status(200).json({
    status: 'success',
    data: saraf,
  });
});

// @desc    Soft delete saraf
// @route   DELETE /api/v1/sarafs/:id
// @access  Private/Admin
const deleteSaraf = asyncHandler(async (req, res, next) => {
  const saraf = await Saraf.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { isDeleted: true },
    { new: true }
  );

  if (!saraf) {
    throw new AppError('صراف ونه موندل شو یا دمخه حذف شوی دی', 404);
  }

  res.status(200).json({
    status: 'success',
    message: 'صراف په بریالیتوب سره حذف شو',
  });
});

module.exports = {
  createSaraf,
  getAllSarafs,
  getSaraf,
  updateSaraf,
  deleteSaraf,
};
