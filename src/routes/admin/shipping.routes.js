const { Router } = require("express");
const {
  createAdminShippingRule,
  deleteAdminShippingRule,
  getAdminShippingRule,
  getAdminShippingRules,
  updateAdminShippingRule,
} = require("../../controllers/shippingController");
const { authenticate, requireAdmin } = require("../../middleware/auth");
const { validateBody, validateParams, validateQuery } = require("../../middleware/validate");
const { idParamSchema } = require("../../validators/common");
const {
  adminShippingQuerySchema,
  createShippingSchema,
  updateShippingSchema,
} = require("../../validators/shippingValidator");

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", validateQuery(adminShippingQuerySchema), getAdminShippingRules);
router.get("/:id", validateParams(idParamSchema), getAdminShippingRule);
router.post("/", validateBody(createShippingSchema), createAdminShippingRule);
router.patch(
  "/:id",
  validateParams(idParamSchema),
  validateBody(updateShippingSchema),
  updateAdminShippingRule,
);
router.delete("/:id", validateParams(idParamSchema), deleteAdminShippingRule);

module.exports = router;
