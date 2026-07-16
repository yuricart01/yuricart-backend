/** Product gallery video: ecommerce best practice is ~30–60s overview clips. */
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_DURATION_SECONDS = 60;

const ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const ALLOWED_VIDEO_MIMES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

module.exports = {
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  MAX_VIDEO_DURATION_SECONDS,
  ALLOWED_IMAGE_MIMES,
  ALLOWED_VIDEO_MIMES,
};
