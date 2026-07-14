const { Router } = require("express");
const { validatePublicCoupon } = require("../../controllers/couponController");
const { validateBody } = require("../../middleware/validate");
const { validateCouponSchema } = require("../../validators/couponValidator");

const router = Router();

router.post("/validate", validateBody(validateCouponSchema), validatePublicCoupon);

module.exports = router;
