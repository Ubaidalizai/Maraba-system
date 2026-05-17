const { isValidObjectId } = require("mongoose");
const AppError = require("../utils/appError");

function checkId(req, res, next) {
  if (!isValidObjectId(req.params.id)) {
    res.status();
    throw new AppError(`ناسم آبجکټ: ${req.params.id}`, 404);
  }
  next();
}

module.exports = checkId;
