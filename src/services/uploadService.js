const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const { BadRequestError } = require("../utils/ApiError");
const { MAX_VIDEO_DURATION_SECONDS } = require("../config/mediaLimits");

function uploadBuffer(buffer, folder) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
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

module.exports = {
  uploadBuffer,
  uploadVideoBuffer,
  deleteFromCloudinary,
  deleteMultipleFromCloudinary,
  PRODUCT_IMAGE_FOLDER,
  GALLERY_IMAGE_FOLDER,
  PRODUCT_VIDEO_FOLDER,
  CATEGORY_IMAGE_FOLDER,
  BRAND_IMAGE_FOLDER,
  BANNER_IMAGE_FOLDER,
};
