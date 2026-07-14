const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

function uploadBuffer(buffer, folder) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
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

async function deleteFromCloudinary(publicId) {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error(`Failed to delete Cloudinary image ${publicId}:`, error);
  }
}

async function deleteMultipleFromCloudinary(publicIds) {
  const valid = publicIds.filter(Boolean);
  if (!valid.length) return;
  try {
    await cloudinary.api.delete_resources(valid);
  } catch (error) {
    console.error("Failed to delete Cloudinary images:", error);
  }
}

const PRODUCT_IMAGE_FOLDER = "yuricart/products";
const GALLERY_IMAGE_FOLDER = "yuricart/products/gallery";
const CATEGORY_IMAGE_FOLDER = "yuricart/categories";
const BRAND_IMAGE_FOLDER = "yuricart/brands";
const BANNER_IMAGE_FOLDER = "yuricart/banners";

module.exports = {
  uploadBuffer,
  deleteFromCloudinary,
  deleteMultipleFromCloudinary,
  PRODUCT_IMAGE_FOLDER,
  GALLERY_IMAGE_FOLDER,
  CATEGORY_IMAGE_FOLDER,
  BRAND_IMAGE_FOLDER,
  BANNER_IMAGE_FOLDER,
};
