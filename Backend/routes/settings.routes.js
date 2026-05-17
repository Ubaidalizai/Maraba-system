const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settings.controller");
const { createSingleUpload } = require("../middlewares/uploadFile");

// Create logo upload middleware
const uploadLogo = createSingleUpload("image", "settings");

router
  .route("/")
  .get(settingsController.getSettings)
  .put(uploadLogo, settingsController.updateSettings);

module.exports = router;
