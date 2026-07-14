const { Router } = require("express");
const {
  createAdminCoupon,
  deleteAdminCoupon,
  getAdminCoupon,
  getAdminCoupons,
  updateAdminCoupon,
} = require("../../controllers/couponController");
const { authenticate, requireAdmin } = require("../../middleware/auth");
const { validateBody, validateParams, validateQuery } = require("../../middleware/validate");
const { idParamSchema } = require("../../validators/common");
const {
  adminCouponQuerySchema,
  createCouponSchema,
  updateCouponSchema,
} = require("../../validators/couponValidator");

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", validateQuery(adminCouponQuerySchema), getAdminCoupons);
router.get("/:id", validateParams(idParamSchema), getAdminCoupon);
router.post("/", validateBody(createCouponSchema), createAdminCoupon);
router.patch(
  "/:id",
  validateParams(idParamSchema),
  validateBody(updateCouponSchema),
  updateAdminCoupon,
);
router.delete("/:id", validateParams(idParamSchema), deleteAdminCoupon);

module.exports = router;
