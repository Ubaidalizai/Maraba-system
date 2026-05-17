const jwt = require("jsonwebtoken");
const User = require("../models/user.model.js");
const asyncHandler = require("./asyncHandler.js");
const { verifyAccessToken } = require("../utils/tokens");

// Authentication middleware (Access Token - Bearer or Cookie)
const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  // Prefer Authorization Bearer header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // Fallback to access_token cookie
  if (!token && req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "اجازه نشته، د لاسرسي ټوکن شتون نلري",
    });
  }

  try {
    const decoded = verifyAccessToken(token);

    const currentUser = await User.findById(decoded.userId);
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: "کاروونکی نور شتون نلري",
      });
    }

    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        message: "کاروونکي په وروستي کې پاسورډ بدل کړی دی",
      });
    }

    req.user = currentUser;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({
      success: false,
      message: "اجازه نشته، ټوکن ناسم یا مهال تیر شوی دی",
    });
  }
});

// Admin authorization middleware
const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res.status(403).send({
      success: false,
      message: "لاسرسی رد شو: د ادمین اجازه اړینه ده",
    });
  }
};

// Prevent Admin deletion
const preventAdminDeletion = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return res.status(403).send({
      success: false,
      message: "لاسرسی رد شو: ادمین حذف کیدای نشي",
    });
  }
  next();
};

module.exports = {
  authenticate,
  authorizeAdmin,
  preventAdminDeletion,
};
