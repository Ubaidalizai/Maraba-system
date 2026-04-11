const express = require("express");
const router = express.Router();

const userController = require("../controllers/user.controller.js");
const {
  authenticate,
  authorizeAdmin,
  preventAdminDeletion,
} = require("../middlewares/authMiddleware");
const checkId = require("../middlewares/checkId");
const { uploadMiddlewares } = require("../middlewares/uploadFile");

// Extract user photo upload middleware (now with lazy loading)
const [uploadUserPhoto, processUserPhoto] = uploadMiddlewares.userPhoto;

// Public routes
router.post(
  "/register",
  uploadUserPhoto,
  processUserPhoto,
  userController.registerUser,
);
router.post("/login", userController.loginUser);
router.post("/refresh", userController.refreshAccessToken);
router.post("/forgotPassword", userController.forgotPassword);
router.post("/resetPassword/:token", userController.resetPassword);

// Protected routes (require authentication)
router.use(authenticate);

router.post("/logout", userController.logout);
router.get("/profile", userController.getUserProfile);
router.patch(
  "/profile",
  uploadUserPhoto,
  processUserPhoto,
  userController.updateCurrentUserProfile
);
router.patch("/updatePassword", userController.updatePassword);
router.patch(
  "/updatePhoto",
  uploadUserPhoto,
  processUserPhoto,
  userController.updateUserPhoto,
);

// Admin routes
router.use(authorizeAdmin);

router.get("/", userController.getAllUsers);
router
  .route("/:id")
  .get(checkId, userController.findUserByID)
  .patch(
    checkId,
    uploadUserPhoto,
    processUserPhoto,
    userController.updateUserById,
  )
  .delete(checkId, preventAdminDeletion, userController.deleteUserByID);

router.patch(
  "/:id/photo",
  checkId,
  uploadUserPhoto,
  processUserPhoto,
  userController.updateUserPhoto,
);

module.exports = router;
