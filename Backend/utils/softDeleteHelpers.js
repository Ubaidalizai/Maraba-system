const mongoose = require('mongoose');
const AppError = require('./AppError');
const asyncHandler = require('../middlewares/asyncHandler');

function parseDeletionFilter(query = {}, baseFilter = {}) {
  const filter = { ...baseFilter };
  if (query.deletedOnly === 'true') {
    filter.isDeleted = true;
  } else if (query.includeDeleted === 'true') {
    // keep filter without isDeleted constraint
  } else {
    filter.isDeleted = false;
  }
  return filter;
}

function softDeleteUpdate(userId, extra = {}) {
  return {
    isDeleted: true,
    deletedAt: new Date(),
    deletedBy: userId || null,
    restoredAt: null,
    ...extra,
  };
}

function markSoftDeleted(doc, userId) {
  doc.isDeleted = true;
  doc.deletedAt = new Date();
  doc.deletedBy = userId || null;
  doc.restoredAt = null;
}

function markRestored(doc) {
  doc.isDeleted = false;
  doc.deletedAt = null;
  doc.deletedBy = null;
  doc.restoredAt = new Date();
}

function createSimpleRestoreHandler(Model, options = {}) {
  const {
    notFoundMessage = 'ریکارډ ونه موندل شو',
    notDeletedMessage = 'ریکارډ حذف شوی نه دی',
    successMessage = 'ریکارډ په بریالیتوب سره بیرته راستون شو',
    onBeforeSave = null,
    responseKey = 'data',
  } = options;

  return asyncHandler(async (req, res) => {
    const doc = await Model.findById(req.params.id);
    if (!doc) {
      throw new AppError(notFoundMessage, 404);
    }
    if (!doc.isDeleted) {
      throw new AppError(notDeletedMessage, 400);
    }

    markRestored(doc);
    if (onBeforeSave) {
      onBeforeSave(doc, req);
    }
    await doc.save();

    res.status(200).json({
      status: 'success',
      success: true,
      message: successMessage,
      [responseKey]: doc,
    });
  });
}

function createPermanentDeleteHandler(Model, options = {}) {
  const {
    notFoundMessage = 'ریکارډ ونه موندل شو',
    notInTrashMessage = 'لومړی باید په کثافاتو کې حذف شوی وي',
    successMessage = 'ریکارډ په تل لپاره حذف شو',
    beforeDelete = null,
  } = options;

  return asyncHandler(async (req, res) => {
    const doc = await Model.findById(req.params.id);
    if (!doc) {
      throw new AppError(notFoundMessage, 404);
    }
    if (!doc.isDeleted) {
      throw new AppError(notInTrashMessage, 400);
    }

    if (beforeDelete) {
      await beforeDelete(doc, req);
    }

    await Model.deleteOne({ _id: doc._id });

    res.status(200).json({
      status: 'success',
      success: true,
      message: successMessage,
    });
  });
}

function validateObjectId(id, message = 'ناسم پیژندنه') {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(message, 400);
  }
}

module.exports = {
  parseDeletionFilter,
  softDeleteUpdate,
  markSoftDeleted,
  markRestored,
  createSimpleRestoreHandler,
  createPermanentDeleteHandler,
  validateObjectId,
};
