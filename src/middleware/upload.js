const multer = require("multer");
const { BadRequestError } = require("../utils/ApiError");
const {
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  ALLOWED_IMAGE_MIMES,
  ALLOWED_VIDEO_MIMES,
} = require("../config/mediaLimits");

const imageUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestError(
          `Invalid file type "${file.originalname}". Allowed: jpg, jpeg, png, webp.`,
        ),
      );
    }
  },
  limits: { fileSize: MAX_IMAGE_SIZE },
});

const productMediaUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === "productVideo") {
      if (ALLOWED_VIDEO_MIMES.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new BadRequestError(
            `Invalid video type "${file.originalname}". Allowed: mp4, webm, mov.`,
          ),
        );
      }
      return;
    }

    if (ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestError(
          `Invalid file type "${file.originalname}". Allowed: jpg, jpeg, png, webp.`,
        ),
      );
    }
  },
  limits: { fileSize: MAX_VIDEO_SIZE },
});

const uploadProductImages = productMediaUpload.fields([
  { name: "primaryImage", maxCount: 1 },
  { name: "galleryImages", maxCount: 10 },
  { name: "productVideo", maxCount: 1 },
]);

const uploadSingleImage = imageUpload.single("image");

function validateProductMediaFileSizes(req, _res, next) {
  const files = req.files || {};

  const imageFiles = [
    ...(files.primaryImage || []),
    ...(files.galleryImages || []),
  ];

  for (const file of imageFiles) {
    if (file.size > MAX_IMAGE_SIZE) {
      return next(
        new BadRequestError(
          `Image "${file.originalname}" is too large. Maximum size is 5MB per image.`,
        ),
      );
    }
  }

  const videoFile = files.productVideo?.[0];
  if (videoFile && videoFile.size > MAX_VIDEO_SIZE) {
    return next(
      new BadRequestError(
        `Video "${videoFile.originalname}" is too large. Maximum size is 50MB.`,
      ),
    );
  }

  next();
}

function handleUploadError(err, _req, _res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      const isVideo = err.field === "productVideo";
      return next(
        new BadRequestError(
          isVideo
            ? "Video too large. Maximum size is 50MB."
            : "File too large. Maximum size is 5MB per image.",
        ),
      );
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return next(new BadRequestError(`Unexpected form field: ${err.field}`));
    }
    return next(new BadRequestError(err.message));
  }
  if (err) return next(err);
  next();
}

module.exports = {
  uploadProductImages,
  uploadSingleImage,
  validateProductMediaFileSizes,
  handleUploadError,
};
