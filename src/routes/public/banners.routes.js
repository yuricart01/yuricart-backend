const { Router } = require("express");
const { getPublicBanner, getPublicBanners } = require("../../controllers/bannerController");
const { validateParams, validateQuery } = require("../../middleware/validate");
const { slugParamSchema } = require("../../validators/common");
const { publicBannerQuerySchema } = require("../../validators/bannerValidator");

const router = Router();

router.get("/", validateQuery(publicBannerQuerySchema), getPublicBanners);
router.get("/:slug", validateParams(slugParamSchema), getPublicBanner);

module.exports = router;
