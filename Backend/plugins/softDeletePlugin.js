const mongoose = require('mongoose');

/**
 * Adds soft-delete metadata fields and query helpers to schemas that use `isDeleted`.
 */
function softDeletePlugin(schema) {
  if (!schema.path('deletedAt')) {
    schema.add({
      deletedAt: { type: Date, default: null },
      deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      restoredAt: { type: Date, default: null },
    });
  }

  schema.query.notDeleted = function notDeleted() {
    return this.where({ isDeleted: false });
  };

  schema.query.deletedOnly = function deletedOnly() {
    return this.where({ isDeleted: true });
  };

  schema.statics.parseDeletionFilter = function parseDeletionFilter(
    query = {},
    baseFilter = {}
  ) {
    const filter = { ...baseFilter };
    if (query.deletedOnly === 'true') {
      filter.isDeleted = true;
    } else if (query.includeDeleted === 'true') {
      delete filter.isDeleted;
    } else {
      filter.isDeleted = false;
    }
    return filter;
  };
}

module.exports = softDeletePlugin;
