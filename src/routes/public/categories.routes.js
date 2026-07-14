const { Router } = require("express");
const {
  getPublicCategories,
  getPublicCategory,
} = require("../../controllers/categoryController");
const { validateParams, validateQuery } = require("../../middleware/validate");
const { slugParamSchema } = require("../../validators/common");
const { publicCategoryQuerySchema } = require("../../validators/categoryValidator");

const router = Router();

router.get("/", validateQuery(publicCategoryQuerySchema), getPublicCategories);
router.get("/:slug", validateParams(slugParamSchema), getPublicCategory);

module.exports = router;
