const { Router } = require("express");
const {
  createPublicOrder,
  getMyOrders,
  trackPublicOrder,
} = require("../../controllers/orderController");
const {
  authenticate,
  optionalAuthenticate,
  requireCustomer,
} = require("../../middleware/auth");
const { validateBody, validateParams, validateQuery } = require("../../middleware/validate");
const { paginationQuerySchema } = require("../../validators/common");
const {
  createOrderSchema,
  orderNumberParamSchema,
  trackOrderQuerySchema,
} = require("../../validators/orderValidator");

const router = Router();

router.post("/", optionalAuthenticate, validateBody(createOrderSchema), createPublicOrder);
router.get(
  "/track/:orderNumber",
  validateParams(orderNumberParamSchema),
  validateQuery(trackOrderQuerySchema),
  trackPublicOrder,
);
router.get(
  "/my",
  authenticate,
  requireCustomer,
  validateQuery(paginationQuerySchema),
  getMyOrders,
);

module.exports = router;
