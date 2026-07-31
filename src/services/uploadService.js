const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const { BadRequestError } = require("../utils/ApiError");
const { MAX_VIDEO_DURATION_SECONDS } = require("../config/mediaLimits");

/**
 * Cloudinary upload presets: resize/crop for the layout slot, then let
 * Cloudinary pick quality/format (typically WebP).
 *
 * homepageSmall matches the designed small-banner canvas: 1080×720 (3:2).
 */
const IMAGE_UPLOAD_PRESETS = {
  default: { width: 1600, crop: "limit", quality: "auto:good", fetch_format: "auto" },
  homepage: { width: 1920, crop: "limit", quality: "auto:good", fetch_format: "auto" },
  homepageSmall: {
    width: 1080,
    height: 720,
    crop: "fill",
    gravity: "auto",
    quality: "auto:good",
    fetch_format: "auto",
  },
  banner: { width: 1920, crop: "limit", quality: "auto:good", fetch_format: "auto" },
  product: { width: 1200, crop: "limit", quality: "auto:good", fetch_format: "auto" },
  gallery: { width: 1200, crop: "limit", quality: "auto:good", fetch_format: "auto" },
  category: { width: 800, crop: "limit", quality: "auto:good", fetch_format: "auto" },
  brand: { width: 600, crop: "limit", quality: "auto:good", fetch_format: "auto" },
};

function resolveImageUploadOptions(presetOrOptions) {
  if (!presetOrOptions) {
    return IMAGE_UPLOAD_PRESETS.default;
  }
  if (typeof presetOrOptions === "string") {
    return (
      IMAGE_UPLOAD_PRESETS[presetOrOptions] || IMAGE_UPLOAD_PRESETS.default
    );
  }
  return { ...IMAGE_UPLOAD_PRESETS.default, ...presetOrOptions };
}

function buildImageTransformation(options) {
  const {
    width,
    height,
    crop = "limit",
    gravity,
    quality = "auto:good",
    fetch_format = "auto",
  } = options;

  const sizeStep = { width, crop };
  if (height) sizeStep.height = height;
  if (gravity) sizeStep.gravity = gravity;

  return [sizeStep, { quality, fetch_format }];
}

function uploadBuffer(buffer, folder, presetOrOptions = "default") {
  const options = resolveImageUploadOptions(presetOrOptions);

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: buildImageTransformation(options),
      },
      (error, result) => {
        if (error) {
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
        } else if (!result) {
          reject(new Error("Cloudinary upload returned empty result"));
        } else {
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      },
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

function buildVideoThumbnailUrl(publicId) {
  return cloudinary.url(publicId, {
    resource_type: "video",
    format: "jpg",
    transformation: [{ start_offset: "0" }],
    secure: true,
  });
}

function uploadVideoBuffer(buffer, folder) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "video",
      },
      async (error, result) => {
        if (error) {
          reject(new Error(`Cloudinary video upload failed: ${error.message}`));
          return;
        }
        if (!result) {
          reject(new Error("Cloudinary video upload returned empty result"));
          return;
        }

        const duration = result.duration || 0;
        if (duration > MAX_VIDEO_DURATION_SECONDS) {
          try {
            await cloudinary.uploader.destroy(result.public_id, {
              resource_type: "video",
            });
          } catch (cleanupError) {
            console.error(
              `Failed to clean up oversized-duration video ${result.public_id}:`,
              cleanupError,
            );
          }
          reject(
            new BadRequestError(
              `Video is too long (${Math.round(duration)}s). Maximum duration is ${MAX_VIDEO_DURATION_SECONDS} seconds.`,
            ),
          );
          return;
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          duration: Math.round(duration * 10) / 10,
          format: result.format || "mp4",
          thumbnailUrl: buildVideoThumbnailUrl(result.public_id),
        });
      },
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

async function deleteFromCloudinary(publicId, resourceType = "image") {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  } catch (error) {
    console.error(
      `Failed to delete Cloudinary ${resourceType} ${publicId}:`,
      error,
    );
  }
}

async function deleteMultipleFromCloudinary(publicIds, resourceType = "image") {
  const valid = publicIds.filter(Boolean);
  if (!valid.length) return;
  try {
    await cloudinary.api.delete_resources(valid, {
      resource_type: resourceType,
    });
  } catch (error) {
    console.error(`Failed to delete Cloudinary ${resourceType}s:`, error);
  }
}

const PRODUCT_IMAGE_FOLDER = "yuricart/products";
const GALLERY_IMAGE_FOLDER = "yuricart/products/gallery";
const PRODUCT_VIDEO_FOLDER = "yuricart/products/videos";
const CATEGORY_IMAGE_FOLDER = "yuricart/categories";
const BRAND_IMAGE_FOLDER = "yuricart/brands";
const BANNER_IMAGE_FOLDER = "yuricart/banners";
const HOMEPAGE_IMAGE_FOLDER = "yuricart/homepage";

module.exports = {
  uploadBuffer,
  uploadVideoBuffer,
  deleteFromCloudinary,
  deleteMultipleFromCloudinary,
  IMAGE_UPLOAD_PRESETS,
  PRODUCT_IMAGE_FOLDER,
  GALLERY_IMAGE_FOLDER,
  PRODUCT_VIDEO_FOLDER,
  CATEGORY_IMAGE_FOLDER,
  BRAND_IMAGE_FOLDER,
  BANNER_IMAGE_FOLDER,
  HOMEPAGE_IMAGE_FOLDER,
};
