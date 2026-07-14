const multer = require("multer");
const { BadRequestError } = require("../utils/ApiError");

const ALLOWED_MIMES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestError(
          `Invalid file type "${file.originalname}". Allowed: jpg, jpeg, png, webp.`,
        ),
      );
    }
  },
  limits: { fileSize: MAX_SIZE },
});

const uploadProductImages = upload.fields([
  { name: "primaryImage", maxCount: 1 },
  { name: "galleryImages", maxCount: 10 },
]);

const uploadSingleImage = upload.single("image");

function handleUploadError(err, _req, _res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(new BadRequestError("File too large. Maximum size is 5MB per image."));
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return next(new BadRequestError(`Unexpected form field: ${err.field}`));
    }
    return next(new BadRequestError(err.message));
  }
  if (err) return next(err);
  next();
}

module.exports = { uploadProductImages, uploadSingleImage, handleUploadError };
