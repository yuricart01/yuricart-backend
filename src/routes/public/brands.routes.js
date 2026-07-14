const { Router } = require("express");
const { getPublicBrand, getPublicBrands } = require("../../controllers/brandController");
const { validateParams, validateQuery } = require("../../middleware/validate");
const { slugParamSchema } = require("../../validators/common");
const { publicBrandQuerySchema } = require("../../validators/brandValidator");

const router = Router();

router.get("/", validateQuery(publicBrandQuerySchema), getPublicBrands);
router.get("/:slug", validateParams(slugParamSchema), getPublicBrand);

module.exports = router;
