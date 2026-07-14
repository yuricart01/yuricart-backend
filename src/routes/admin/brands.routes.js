const { Router } = require("express");
const {
  createAdminBrand,
  deleteAdminBrand,
  getAdminBrand,
  getAdminBrands,
  updateAdminBrand,
} = require("../../controllers/brandController");
const { authenticate, requireAdmin } = require("../../middleware/auth");
const { validateBody, validateParams, validateQuery } = require("../../middleware/validate");
const { uploadSingleImage, handleUploadError } = require("../../middleware/upload");
const { idParamSchema } = require("../../validators/common");
const {
  adminBrandQuerySchema,
  createBrandSchema,
  updateBrandSchema,
} = require("../../validators/brandValidator");

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", validateQuery(adminBrandQuerySchema), getAdminBrands);
router.get("/:id", validateParams(idParamSchema), getAdminBrand);
router.post("/", uploadSingleImage, handleUploadError, validateBody(createBrandSchema), createAdminBrand);
router.patch("/:id", validateParams(idParamSchema), uploadSingleImage, handleUploadError, validateBody(updateBrandSchema), updateAdminBrand);
router.delete("/:id", validateParams(idParamSchema), deleteAdminBrand);

module.exports = router;
