const Settings = require("../models/settings.model");
const asyncHandler = require("../middlewares/asyncHandler");
const AppError = require("../utils/appError");
const { deleteOldImage } = require("../middlewares/uploadFile");

// Get settings (returns first/only settings document)
exports.getSettings = asyncHandler(async (req, res, next) => {
  let settings = await Settings.findOne();

  res.status(200).json({
    status: "success",
    data: { settings },
  });
});

// Update settings
exports.updateSettings = asyncHandler(async (req, res, next) => {
  const {
    companyName,
    companyNameEnglish,
    address,
    phone1,
    phone2,
    phone3,
    email,
    website,
    taxId,
    description,
    expiryNotifyDays,
  } = req.body;

  // Build update object
  const updateData = {};
  if (companyName !== undefined) updateData.companyName = companyName;
  if (companyNameEnglish !== undefined) updateData.companyNameEnglish = companyNameEnglish;
  if (address !== undefined) updateData.address = address;
  if (phone1 !== undefined) updateData.phone1 = phone1;
  if (phone2 !== undefined) updateData.phone2 = phone2;
  if (phone3 !== undefined) updateData.phone3 = phone3;
  if (email !== undefined) updateData.email = email;
  if (website !== undefined) updateData.website = website;
  if (taxId !== undefined) updateData.taxId = taxId;
  if (description !== undefined) updateData.description = description;
  if (expiryNotifyDays !== undefined) {
    updateData.expiryNotifyDays = Number(expiryNotifyDays);
  }

  // Handle logo upload - check for existing settings first
  const existingSettings = await Settings.findOne();
  
  if (req.processedFiles && req.processedFiles.image) {
    console.log('Processing image upload:', req.processedFiles.image);
    if (existingSettings?.logo) {
      console.log('Deleting old logo:', existingSettings.logo);
      deleteOldImage(existingSettings.logo, "settings");
    }
    updateData.logo = req.processedFiles.image;
    console.log('Logo added to updateData:', updateData.logo);
  } else {
    console.log('No image in processedFiles:', req.processedFiles);
  }

  // Update or create settings document
  const settings = await Settings.findOneAndUpdate(
    {},
    updateData,
    { new: true, upsert: true, runValidators: true }
  );

  res.status(200).json({
    status: "success",
    data: { settings },
  });
});
