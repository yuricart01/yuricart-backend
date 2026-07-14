const { Router } = require("express");
const {
  getCategoryProducts,
  getPublicProduct,
  getPublicProducts,
  getPublicRelatedProducts,
} = require("../../controllers/productController");
const { validateParams, validateQuery } = require("../../middleware/validate");
const { slugParamSchema } = require("../../validators/common");
const { publicProductQuerySchema } = require("../../validators/productValidator");

const router = Router();

router.get("/", validateQuery(publicProductQuerySchema), getPublicProducts);
router.get("/:slug/related", validateParams(slugParamSchema), getPublicRelatedProducts);
router.get("/:slug", validateParams(slugParamSchema), getPublicProduct);

module.exports = router;

const categoryProductsRouter = Router();
categoryProductsRouter.get(
  "/:slug/products",
  validateParams(slugParamSchema),
  validateQuery(publicProductQuerySchema),
  getCategoryProducts,
);

module.exports.categoryProductsRouter = categoryProductsRouter;
