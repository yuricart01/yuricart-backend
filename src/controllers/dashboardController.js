const { getDashboardStats } = require("../services/dashboardService");
const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

const getAdminDashboard = asyncHandler(async (_req, res) => {
  const stats = await getDashboardStats();
  sendSuccess(res, stats);
});

module.exports = { getAdminDashboard };
