const { Router } = require("express");
const { getAdminDashboard } = require("../../controllers/dashboardController");
const { authenticate, requireAdmin } = require("../../middleware/auth");

const router = Router();

router.use(authenticate, requireAdmin);
router.get("/", getAdminDashboard);

module.exports = router;
