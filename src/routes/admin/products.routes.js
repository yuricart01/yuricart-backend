const { Router } = require("express");
const {
  createAdminProduct,
  deleteAdminProduct,
  getAdminProduct,
  getAdminProducts,
  updateAdminProduct,
} = require("../../controllers/productController");
const { authenticate, requireAdmin } = require("../../middleware/auth");
const { validateParams, validateQuery } = require("../../middleware/validate");
const { uploadProductImages, handleUploadError } = require("../../middleware/upload");
const { idParamSchema } = require("../../validators/common");
const { adminProductQuerySchema } = require("../../validators/productValidator");

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", validateQuery(adminProductQuerySchema), getAdminProducts);
router.get("/:id", validateParams(idParamSchema), getAdminProduct);
router.post(
  "/",
  uploadProductImages,
  handleUploadError,
  createAdminProduct,
);
router.patch(
  "/:id",
  validateParams(idParamSchema),
  uploadProductImages,
  handleUploadError,
  updateAdminProduct,
);
router.delete("/:id", validateParams(idParamSchema), deleteAdminProduct);

module.exports = router;
