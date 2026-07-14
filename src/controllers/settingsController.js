const { getSettingsByGroup, upsertSettings } = require("../services/settingsService");
const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

const getAdminSettings = asyncHandler(async (req, res) => {
  const settings = await getSettingsByGroup(
    req.query.group,
  );
  sendSuccess(res, settings);
});

const patchAdminSettings = asyncHandler(async (req, res) => {
  const results = await upsertSettings(req.body);
  sendSuccess(res, results);
});

module.exports = { getAdminSettings, patchAdminSettings };
