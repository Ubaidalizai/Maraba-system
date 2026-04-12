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
      message: 'د دې برېښنا پتې سره کاروونکی دمخه شتون لري',
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
      message: 'نوی کاروونکی په بریالیتوب سره زیات شو',
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
      message: 'د کاروونکي د ذخیره کولو کې ستونزه، مهرباني وروسته بیا هڅه وکړئ',
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
      message: 'کاروونکی ونه موندل شو',
    });
  }

  res.status(200).json({
    success: true,
    message: 'د کاروونکي انځور په بریالیتوب سره تازه شو',
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
      message: 'برېښنا پته یا پاسورډ ناسم دی!',
    });
  }
});

const logout = (req, res) => {
  clearAuthCookies(res);
  res.status(200).json({
    success: true,
    message: 'په بریالیتوب سره وځی شوئ',
  });
};

const refreshAccessToken = asyncHandler(async (req, res) => {
  const token = req.cookies && req.cookies.refresh_token;
  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: 'د تازه کولو ټوکن شتون نلري' });
  }

  try {
    const decoded = verifyRefreshToken(token);
    const currentUser = await User.findById(decoded.userId);
    if (!currentUser) {
      return res
        .status(401)
        .json({ success: false, message: 'کاروونکی نور شتون نلري' });
    }

    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return res
        .status(401)
        .json({ success: false, message: 'کاروونکي په وروستي کې پاسورډ بدل کړی دی' });
    }

    const newAccessToken = generateAccessToken(currentUser._id);
    setAuthCookies(res, newAccessToken, token);
    return res.json({ success: true, accessToken: newAccessToken });
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: 'د تازه کولو ټوکن ناسم یا مهال تیر شوی دی' });
  }
});

const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'کاروونکی ونه موندل شو',
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
          message: 'د دې برېښنا پتې سره کاروونکی دمخه شتون لري',
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
      message: 'کاروونکی ونه موندل شو!',
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
          message: 'د دې برېښنا پتې سره کاروونکی دمخه شتون لري',
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
      message: 'کاروونکی ونه موندل شو',
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
      message: 'کاروونکی ونه موندل شو',
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
        message: 'د ادمین په توګه کاروونکی حذف کیدای نشي!',
      });
    }

    if (user.image && user.image !== 'default-user.jpg') {
      deleteOldImage(user.image, 'users');
    }

    await User.deleteOne({ _id: user._id });
    res.status(204).json({ message: 'کاروونکی په بریالیتوب سره حذف شو' });
  } else {
    return res.status(404).json({
      success: false,
      message: 'کاروونکی ونه موندل شو!',
    });
  }
});

const updatePassword = asyncHandler(async (req, res, next) => {
  const { _id } = req.user;

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).send({
      success: false,
      message: 'اوسنی پاسورډ او نوی پاسورډ اړین دی',
    });
  }

  const user = await User.findById(_id);

  if (!user) {
    return res.status(404).send({
      success: false,
      message: 'کاروونکی ونه موندل شو',
    });
  }

  const isMatch = await user.isPasswordValid(currentPassword);
  if (!isMatch) {
    return res.status(401).send({
      success: false,
      message: 'ستاسو اوسنی پاسورډ ناسم دی',
    });
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'ستاسو پاسورډ په بریالیتوب سره تازه شو',
  });
});

const forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase().trim() });
  if (!user) {
    return res.status(404).send({
      success: false,
      message: 'د دې برېښنا پتې سره هیڅ کاروونکی شتون نلري.',
    });
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    const resetURL = `http://localhost:5173/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'ټوکن برېښنا پتې ته ولیږل شو، خپلې برېښنا پتې ته لاړ شئ او د لیږل شوي لینک په کلیک وکړئ!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    console.error(err);
    return res.status(500).send({
      success: false,
      message: 'د برېښنا پتې د لیږلو کې ستونزه رامنځته شوه. مهرباني وروسته بیا هڅه وکړئ!',
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
      message: 'ټوکن ناسم یا مهال تیر شوی دی!',
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
    message: 'ستاسو پاسورډ په بریالیتوب سره بیرته تنظیم شو',
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
