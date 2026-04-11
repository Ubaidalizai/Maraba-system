const User = require('../models/user.model');
const asyncHandler = require('../middlewares/asyncHandler.js');

const {
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  verifyRefreshToken,
} = require('../utils/tokens');
const Email = require('../utils/email.js');
const { deleteOldImage } = require('../middlewares/uploadFile.js');

const crypto = require('crypto');
const {
  userValidationSchema,
  loginValidationSchema,
  updateUserValidationSchema,
  updateProfileValidationSchema,
} = require('../validations');

const registerUser = asyncHandler(async (req, res) => {
  const { error } = userValidationSchema.validate(req.body);

  if (error) {
    return res.status(400).send({
      success: false,
      message: error.details[0].message,
    });
  }

  const { name, email, phone, password, role, isActive } = req.body;

  const userExists = await User.findOne({ email });

  if (userExists) {
    return res.status(409).send({
      success: false,
      message: 'کاربر با این ایمیل آدرس از قبل موجود است',
    });
  }

  const newUser = new User({
    name,
    email,
    phone,
    password,
    role,
    image: req.file ? req.file.filename : 'default-user.jpg',
  });

  try {
    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'کاربر جدید با موفقیت اضافه شد',
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        image: newUser.image,
        isActive: newUser.isActive,
      },
    });
  } catch (error) {
    console.error('Error saving user:', error);
    res.status(500).send({
      success: false,
      message: 'خطا در ذخیره کاربر، لطفاً بعداً دوباره تلاش کنید',
    });
  }
});

const updateUserPhoto = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const currentUser = await User.findById(id);
  if (currentUser.image && currentUser.image !== 'default-user.jpg') {
    deleteOldImage(currentUser.image, 'users');
  }

  const user = await User.findByIdAndUpdate(
    id,
    {
      image: req.file.filename,
    },
    {
      new: true,
      runValidators: true,
    }
  ).select('-password');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'کاربر یافت نشد',
    });
  }

  res.status(200).json({
    success: true,
    message: 'عکس کاربر با موفقیت بروزرسانی شد',
    data: user,
  });
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

  if (user && (await user.isPasswordValid(password, user.password))) {
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    setAuthCookies(res, accessToken, refreshToken);
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image,
    };

    res.json({
      success: true,
      user: userData,
      accessToken,
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'ایمیل یا رمز عبور نادرست است!',
    });
  }
});

const logout = (req, res) => {
  clearAuthCookies(res);
  res.status(200).json({
    success: true,
    message: 'با موفقیت خارج شدید',
  });
};

const refreshAccessToken = asyncHandler(async (req, res) => {
  const token = req.cookies && req.cookies.refresh_token;
  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: 'توکن تازه سازی موجود نیست' });
  }

  try {
    const decoded = verifyRefreshToken(token);
    const currentUser = await User.findById(decoded.userId);
    if (!currentUser) {
      return res
        .status(401)
        .json({ success: false, message: 'کاربر دیگر وجود ندارد' });
    }

    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return res
        .status(401)
        .json({ success: false, message: 'کاربر اخیراً رمز عبور را تغییر داده است' });
    }

    const newAccessToken = generateAccessToken(currentUser._id);
    setAuthCookies(res, newAccessToken, token);
    return res.json({ success: true, accessToken: newAccessToken });
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: 'توکن تازه سازی نامعتبر یا منقضی شده است' });
  }
});

const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'کاربر یافت نشد',
    });
  }

  res.json({
    success: true,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      image: user.image,
    },
  });
});

const updateUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { error } = updateUserValidationSchema.validate(req.body);

  if (error) {
    return res.status(400).send({
      success: false,
      message: error.details[0].message,
    });
  }

  const { name, email, phone, role, isActive } = req.body;

  const user = await User.findById(id);

  if (user) {
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(409).send({
          success: false,
          message: 'کاربر با این ایمیل آدرس از قبل موجود است',
        });
      }
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    user.role = role || user.role;
    if (isActive !== undefined) user.isActive = isActive;

    if (req.file) {
      user.image = req.file.filename;
    }

    const updatedUser = await user.save();
    res.status(200).json({
      success: true,
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        image: updatedUser.image,
        isActive: updatedUser.isActive,
      },
    });
  } else {
    return res.status(404).json({
      success: false,
      message: 'کاربر یافت نشد!',
    });
  }
});

const updateCurrentUserProfile = asyncHandler(async (req, res) => {
  const { _id } = req.user;

  const { error } = updateProfileValidationSchema.validate(req.body);

  if (error) {
    return res.status(400).send({
      success: false,
      message: error.details[0].message,
    });
  }

  const { name, email, phone } = req.body;

  const user = await User.findById(_id);

  if (user) {
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(409).send({
          success: false,
          message: 'کاربر با این ایمیل آدرس از قبل موجود است',
        });
      }
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone || user.phone;

    if (req.file) {
      if (user.image && user.image !== 'default-user.jpg') {
        deleteOldImage(user.image, 'users');
      }
      user.image = req.file.filename;
    }

    const updatedUser = await user.save();

    res.json({
      success: true,
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      image: updatedUser.image,
      isActive: updatedUser.isActive,
    });
  } else {
    return res.status(404).json({
      success: false,
      message: 'کاربر یافت نشد',
    });
  }
});

const getAllUsers = asyncHandler(async (req, res) => {
  const { search } = req.query;
  let filter = {};
  if (search) {
    filter = {
      name: { $regex: search, $options: 'i' },
    };
  }
  const users = await User.find(filter);
  res.status(200).json({
    success: true,
    data: { results: users },
    count: users.length,
  });
});

const findUserByID = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const user = await User.findById({ _id: id }).select('-password');

  if (user) {
    res.status(200).json(user);
  } else {
    return res.status(404).json({
      success: false,
      message: 'کاربر یافت نشد',
    });
  }
});

const deleteUserByID = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const user = await User.findById({ _id: id });
  if (user) {
    if (user.isAdmin) {
      return res.status(400).json({
        success: false,
        message: 'نمیتوان کاربر را به عنوان ادمین حذف کرد!',
      });
    }

    if (user.image && user.image !== 'default-user.jpg') {
      deleteOldImage(user.image, 'users');
    }

    await User.deleteOne({ _id: user._id });
    res.status(204).json({ message: 'کاربر با موفقیت حذف شد' });
  } else {
    return res.status(404).json({
      success: false,
      message: 'کاربر یافت نشد!',
    });
  }
});

const updatePassword = asyncHandler(async (req, res, next) => {
  const { _id } = req.user;

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).send({
      success: false,
      message: 'رمز عبور فعلی و جدید الزامی است',
    });
  }

  const user = await User.findById(_id);

  if (!user) {
    return res.status(404).send({
      success: false,
      message: 'کاربر یافت نشد',
    });
  }

  const isMatch = await user.isPasswordValid(currentPassword);
  if (!isMatch) {
    return res.status(401).send({
      success: false,
      message: 'رمز عبور فعلی شما نادرست است',
    });
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'رمز عبور شما با موفقیت بروزرسانی شد',
  });
});

const forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase().trim() });
  if (!user) {
    return res.status(404).send({
      success: false,
      message: 'هیچ کاربری با این ایمیل آدرس وجود ندارد.',
    });
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    const resetURL = `http://localhost:5173/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'توکن به ایمیل ارسال شد، به ایمیل خود بروید و روی لینک ارسالی کلیک کنید!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    console.error(err);
    return res.status(500).send({
      success: false,
      message: 'خطا در ارسال ایمیل رخ داد. لطفاً بعداً دوباره تلاش کنید!',
    });
  }
});

const resetPassword = asyncHandler(async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).send({
      success: false,
      message: 'توکن نامعتبر یا منقضی شده است!',
    });
  }
  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  setAuthCookies(res, accessToken, refreshToken);
  res.status(200).json({
    status: 'success',
    message: 'رمز عبور شما با موفقیت بازنشانی شد',
    accessToken,
  });
});

module.exports = {
  registerUser,
  loginUser,
  updateCurrentUserProfile,
  getAllUsers,
  findUserByID,
  updateUserById,
  deleteUserByID,
  updateUserPhoto,
  updatePassword,
  forgotPassword,
  resetPassword,
  logout,
  getUserProfile,
  refreshAccessToken,
};
