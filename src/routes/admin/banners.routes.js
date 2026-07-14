const { Router } = require("express");
const {
  createAdminBanner,
  deleteAdminBanner,
  getAdminBanner,
  getAdminBanners,
  updateAdminBanner,
} = require("../../controllers/bannerController");
const { authenticate, requireAdmin } = require("../../middleware/auth");
const { validateBody, validateParams, validateQuery } = require("../../middleware/validate");
const { uploadSingleImage, handleUploadError } = require("../../middleware/upload");
const { idParamSchema } = require("../../validators/common");
const {
  adminBannerQuerySchema,
  createBannerSchema,
  updateBannerSchema,
} = require("../../validators/bannerValidator");

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", validateQuery(adminBannerQuerySchema), getAdminBanners);
router.get("/:id", validateParams(idParamSchema), getAdminBanner);
router.post("/", uploadSingleImage, handleUploadError, validateBody(createBannerSchema), createAdminBanner);
router.patch("/:id", validateParams(idParamSchema), uploadSingleImage, handleUploadError, validateBody(updateBannerSchema), updateAdminBanner);
router.delete("/:id", validateParams(idParamSchema), deleteAdminBanner);

module.exports = router;
