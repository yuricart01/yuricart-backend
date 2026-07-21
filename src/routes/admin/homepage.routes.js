const { Router } = require("express");
const {
  createHeroSlideHandler,
  deleteHeroSlideHandler,
  getAdminHomepageHandler,
  reorderHeroSlidesHandler,
  updateFeaturedSectionsHandler,
  updateHeroSlideHandler,
  upsertSlotHandler,
} = require("../../controllers/homepageController");
const { authenticate, requireAdmin } = require("../../middleware/auth");
const { validateBody, validateParams } = require("../../middleware/validate");
const { uploadSingleImage, handleUploadError } = require("../../middleware/upload");
const {
  createHeroSlideSchema,
  idParamSchema,
  reorderHeroSchema,
  sectionParamSchema,
  updateFeaturedSectionsSchema,
  updateHeroSlideSchema,
  upsertSlotSchema,
} = require("../../validators/homepageValidator");

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", getAdminHomepageHandler);

router.post(
  "/hero",
  uploadSingleImage,
  handleUploadError,
  validateBody(createHeroSlideSchema),
  createHeroSlideHandler,
);

router.patch(
  "/hero/reorder",
  validateBody(reorderHeroSchema),
  reorderHeroSlidesHandler,
);

router.patch(
  "/hero/:id",
  validateParams(idParamSchema),
  uploadSingleImage,
  handleUploadError,
  validateBody(updateHeroSlideSchema),
  updateHeroSlideHandler,
);

router.delete(
  "/hero/:id",
  validateParams(idParamSchema),
  deleteHeroSlideHandler,
);

router.put(
  "/banners/:section/:slot",
  validateParams(sectionParamSchema),
  uploadSingleImage,
  handleUploadError,
  validateBody(upsertSlotSchema),
  upsertSlotHandler,
);

router.patch(
  "/featured-sections",
  validateBody(updateFeaturedSectionsSchema),
  updateFeaturedSectionsHandler,
);

module.exports = router;
