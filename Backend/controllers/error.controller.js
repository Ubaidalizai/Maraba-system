const AppError = require("../utils/appError");

const handleCastErrorDB = (err) => {
  const message = `ناسم ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldDB = (err) => {
  const regex = /name: "(.*?)"/;
  const name = err.message.match(regex);
  const message = name
    ? `تکراري ارزښت ${name[1]}. مهرباني وکړئ بل ارزښت وکاروئ.`
    : "تکراري ارزښت. مهرباني وکړئ بل ارزښت وکاروئ.";
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `ناسم معلومات. ${errors.join(". ")}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError("ناسم ټوکن. مهرباني وکړئ بیرته ننوځئ!", 401);
const handleJWTExpired = () =>
  new AppError("ستاسو ټوکن پای ته رسیدلی. مهرباني وکړئ بیرته ننوځئ!", 401);

const sendErrorDev = (err, req, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, req, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }
  // Programming or unknown error: don't leak error details
  console.error("Error:", err);
  return res.status(500).json({
    status: "error",
    message: "یوه ستونزه رامنځته شوه!",
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === "production") {
    let error = { ...err, message: err.message };

    if (error.name === "CastError") error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldDB(error);
    if (error.name === "ValidationError")
      error = handleValidationErrorDB(error);
    if (error.name === "JsonWebTokenError") error = handleJWTError();
    if (error.name === "TokenExpiredError") error = handleJWTExpired();

    sendErrorProd(error, req, res);
  }
};
