const { Router } = require("express");
const {
  createAdminCategory,
  deleteAdminCategory,
  getAdminCategories,
  getAdminCategory,
  updateAdminCategory,
} = require("../../controllers/categoryController");
const { authenticate, requireAdmin } = require("../../middleware/auth");
const { validateBody, validateParams, validateQuery } = require("../../middleware/validate");
const { uploadSingleImage, handleUploadError } = require("../../middleware/upload");
const { idParamSchema } = require("../../validators/common");
const {
  adminCategoryQuerySchema,
  createCategorySchema,
  updateCategorySchema,
} = require("../../validators/categoryValidator");

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", validateQuery(adminCategoryQuerySchema), getAdminCategories);
router.get("/:id", validateParams(idParamSchema), getAdminCategory);
router.post("/", uploadSingleImage, handleUploadError, validateBody(createCategorySchema), createAdminCategory);
router.patch("/:id", validateParams(idParamSchema), uploadSingleImage, handleUploadError, validateBody(updateCategorySchema), updateAdminCategory);
router.delete("/:id", validateParams(idParamSchema), deleteAdminCategory);

module.exports = router;
