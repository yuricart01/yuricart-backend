const { Router } = require("express");
const {
  getAdminOrder,
  getAdminOrders,
  patchAdminOrder,
} = require("../../controllers/orderController");
const { authenticate, requireAdmin } = require("../../middleware/auth");
const { validateBody, validateParams, validateQuery } = require("../../middleware/validate");
const { idParamSchema } = require("../../validators/common");
const {
  adminOrderQuerySchema,
  updateOrderStatusSchema,
} = require("../../validators/orderValidator");

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", validateQuery(adminOrderQuerySchema), getAdminOrders);
router.get("/:id", validateParams(idParamSchema), getAdminOrder);
router.patch(
  "/:id",
  validateParams(idParamSchema),
  validateBody(updateOrderStatusSchema),
  patchAdminOrder,
);

module.exports = router;
