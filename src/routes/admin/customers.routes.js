const { Router } = require("express");
const {
  getAdminCustomers,
  patchAdminCustomer,
} = require("../../controllers/customerController");
const { authenticate, requireAdmin } = require("../../middleware/auth");
const { validateBody, validateParams, validateQuery } = require("../../middleware/validate");
const { idParamSchema } = require("../../validators/common");
const {
  adminCustomerQuerySchema,
  updateCustomerStatusSchema,
} = require("../../validators/authValidator");

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", validateQuery(adminCustomerQuerySchema), getAdminCustomers);
router.patch(
  "/:id",
  validateParams(idParamSchema),
  validateBody(updateCustomerStatusSchema),
  patchAdminCustomer,
);

module.exports = router;
