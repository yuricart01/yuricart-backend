const { Router } = require("express");
const {
  getAdminSettings,
  patchAdminSettings,
} = require("../../controllers/settingsController");
const { authenticate, requireAdmin } = require("../../middleware/auth");
const { validateBody, validateQuery } = require("../../middleware/validate");
const {
  settingsQuerySchema,
  upsertSettingsSchema,
} = require("../../validators/settingsValidator");

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", validateQuery(settingsQuerySchema), getAdminSettings);
router.patch("/", validateBody(upsertSettingsSchema), patchAdminSettings);

module.exports = router;
