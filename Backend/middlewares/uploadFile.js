const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const asyncHandler = require("./asyncHandler");
const AppError = require("../utils/appError");

// Define allowed file types and their corresponding MIME types
const ALLOWED_FILE_TYPES = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  // Add more file types as needed
};

// Configure Multer Storage in memory
const multerStorage = multer.memoryStorage();

// Enhanced file filter with multiple file type support
const multerFilter = (req, file, cb) => {
  // Explicitly define allowed fields and their types for all entities
  const FIELD_TYPE_MAP = {
    // User fields
    image: "image",
    userImage: "image",
    profileImage: "image",

    // Trainer fields
    trainerImage: "image",

    // Member fields
    memberImage: "image",

    // ShopKeeper fields
    shopKeeperImage: "image",

    // General fields
    elderImage: "image",
    documents: "document",
    avatar: "image",
    photo: "image",
  };

  // Check if the field name is specified in allowed types
  const fileType = FIELD_TYPE_MAP[file.fieldname];
  const allowedMimeTypes = ALLOWED_FILE_TYPES[fileType];

  if (!allowedMimeTypes) {
    cb(
      new AppError(
        `Invalid file field: ${file.fieldname}. Allowed fields: ${Object.keys(FIELD_TYPE_MAP).join(", ")}`,
        400,
      ),
      false,
    );
    return;
  }

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `Invalid file type for ${file.fieldname}. Allowed types: ${allowedMimeTypes.join(", ")}`,
        400,
      ),
      false,
    );
  }
};

// Configure file size limits (in bytes)
const FILE_SIZE_LIMITS = {
  image: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
};

// Multer upload configuration
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: {
    fileSize: Math.max(...Object.values(FILE_SIZE_LIMITS)),
  },
});

// Create field configuration for multiple file uploads
const uploadFields = [
  // User fields
  { name: "image", maxCount: 1 },
  { name: "userImage", maxCount: 1 },
  { name: "profileImage", maxCount: 1 },

  // Trainer fields
  { name: "trainerImage", maxCount: 1 },

  // Member fields
  { name: "memberImage", maxCount: 1 },

  // ShopKeeper fields
  { name: "shopKeeperImage", maxCount: 1 },

  // General fields
  { name: "elderImage", maxCount: 1 },
  { name: "documents", maxCount: 5 },
  { name: "avatar", maxCount: 1 },
  { name: "photo", maxCount: 1 },
];

// Middleware to handle multiple file uploads
const uploadFiles = upload.fields(uploadFields);

// Function to ensure directory exists
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
    } catch (error) {
      throw new AppError(`Failed to create directory: ${dirPath}`, 500);
    }
  }
};

// Function to process image files
const processImage = async (file, options = {}) => {
  const { width = 500, height = 500, quality = 90, format = "jpeg" } = options;

  try {
    const processor = sharp(file.buffer);

    if (width && height) {
      processor.resize(width, height, {
        fit: "cover",
        position: "center",
      });
    }

    processor.toFormat(format);

    if (format === "jpeg") {
      processor.jpeg({ quality });
    } else if (format === "webp") {
      processor.webp({ quality });
    }

    return processor;
  } catch (error) {
    throw new AppError(`Error processing image: ${error.message}`, 500);
  }
};

// Function to determine directory based on field name
const getDirectoryForField = (fieldName) => {
  const directoryMap = {
    // User fields
    image: "users",
    userImage: "users",
    profileImage: "users",

    // Trainer fields
    trainerImage: "trainers",

    // Member fields
    memberImage: "members",

    // ShopKeeper fields
    shopKeeperImage: "shopkeepers",

    // General fields
    elderImage: "learner",
    documents: "documents",
    avatar: "avatars",
    photo: "photos",
  };

  return directoryMap[fieldName] || "uploads";
};

// Enhanced middleware to process uploaded files with dynamic directories
const processUploadedFiles = (entityType = null) => {
  return asyncHandler(async (req, res, next) => {
    console.log("Processing Files:", {
      entityType,
      hasFiles: !!req.files,
      hasFile: !!req.file,
      file: req.file,
      files: req.files,
    });

    if (!req.files && !req.file) return next();

    const processedFiles = {};

    // Handle single file upload (req.file)
    if (req.file) {
      const fieldName = req.file.fieldname;
      const fileType = fieldName;
      const subdirectory = entityType || getDirectoryForField(fieldName);
      const dir = path.join(__dirname, `../public/images/${subdirectory}`);
      ensureDirectoryExists(dir);

      const filename = `${fileType}-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 11)}`;

      if (ALLOWED_FILE_TYPES.image.includes(req.file.mimetype)) {
        // Process images
        const finalFilename = `${filename}.jpeg`;
        const processor = await processImage(req.file, {
          width: 500,
          height: 500,
          quality: 90,
          format: "jpeg",
        });
        await processor.toFile(path.join(dir, finalFilename));
        req.file.filename = finalFilename;
        req.processedFiles = { [fieldName]: finalFilename };
      } else {
        // Handle other file types
        const extension = path.extname(req.file.originalname);
        const finalFilename = `${filename}${extension}`;
        fs.writeFileSync(path.join(dir, finalFilename), req.file.buffer);
        req.file.filename = finalFilename;
        req.processedFiles = { [fieldName]: finalFilename };
      }
    }

    // Handle multiple file uploads (req.files)
    if (req.files) {
      for (const [fieldName, files] of Object.entries(req.files)) {
        const fileType = fieldName;
        const subdirectory = entityType || getDirectoryForField(fieldName);
        const dir = path.join(__dirname, `../public/images/${subdirectory}`);
        ensureDirectoryExists(dir);

        // Process each file in the field
        const processedFieldFiles = await Promise.all(
          files.map(async (file) => {
            const filename = `${fileType}-${Date.now()}-${Math.random()
              .toString(36)
              .substring(2, 11)}`;

            if (ALLOWED_FILE_TYPES.image.includes(file.mimetype)) {
              // Process images
              const finalFilename = `${filename}.jpeg`;
              const processor = await processImage(file, {
                width: 500,
                height: 500,
                quality: 90,
                format: "jpeg",
              });
              await processor.toFile(path.join(dir, finalFilename));
              return finalFilename;
            } else {
              // Handle other file types
              const extension = path.extname(file.originalname);
              const finalFilename = `${filename}${extension}`;
              fs.writeFileSync(path.join(dir, finalFilename), file.buffer);
              return finalFilename;
            }
          }),
        );

        processedFiles[fieldName] =
          files.length === 1 ? processedFieldFiles[0] : processedFieldFiles;
      }

      // Attach processed files to request
      req.processedFiles = processedFiles;
    }

    next();
  });
};

// Error handling middleware for file uploads
const handleFileUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        status: "error",
        message: `File too large. Maximum size allowed: ${
          FILE_SIZE_LIMITS[err.field] / (1024 * 1024)
        }MB`,
      });
    }
    return res.status(400).json({
      status: "error",
      message: err.message,
    });
  }
  next(err);
};

// Function to delete old images
const deleteOldImage = (imagePath, subdirectory) => {
  if (imagePath) {
    const fullPath = path.join(
      __dirname,
      `../public/images/${subdirectory}`,
      imagePath,
    );
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
};

// Utility function to create single file upload middleware for specific entity
const createSingleUpload = (fieldName = "image", entityType = null) => {
  const singleUpload = upload.single(fieldName);
  const processFiles = processUploadedFiles(entityType);

  return [singleUpload, processFiles];
};

// Utility function to create multiple file upload middleware
const createMultipleUpload = (fields, entityType = null) => {
  const multipleUpload = upload.fields(fields);
  const processFiles = processUploadedFiles(entityType);

  return [multipleUpload, processFiles];
};

// Pre-configured upload middlewares for common use cases (lazy loading)
const uploadMiddlewares = {
  // User uploads
  get userPhoto() {
    return createSingleUpload("image", "users");
  },
  get userProfile() {
    return createSingleUpload("profileImage", "users");
  },

  // Trainer uploads
  get trainerPhoto() {
    return createSingleUpload("image", "trainers");
  },

  // Member uploads
  get memberPhoto() {
    return createSingleUpload("image", "members");
  },

  // Worker uploads
  get workerPhoto() {
    return createSingleUpload("image", "workers");
  },

  // ShopKeeper uploads
  get shopKeeperPhoto() {
    return createSingleUpload("image", "shopkeepers");
  },

  // Generic uploads
  get singleImage() {
    return createSingleUpload("image");
  },
  get multipleImages() {
    return createMultipleUpload([{ name: "images", maxCount: 10 }]);
  },
  get documentsUpload() {
    return createMultipleUpload([{ name: "documents", maxCount: 5 }]);
  },
};

module.exports = {
  // Core middleware
  uploadFiles,
  processUploadedFiles,
  handleFileUploadErrors,
  deleteOldImage,

  // Utility functions
  createSingleUpload,
  createMultipleUpload,

  // Pre-configured middlewares
  uploadMiddlewares,

  // Direct access to multer instance for custom configurations
  upload,
};
