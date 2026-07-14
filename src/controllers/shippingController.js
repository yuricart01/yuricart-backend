const {
  createShipping,
  deleteShipping,
  getShippingById,
  listAdminShipping,
  updateShipping,
} = require("../services/shippingService");
const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

const getAdminShippingRules = asyncHandler(async (req, res) => {
  const result = await listAdminShipping(req.query);
  sendSuccess(res, result.items, 200, result.meta);
});

const getAdminShippingRule = asyncHandler(async (req, res) => {
  const rule = await getShippingById(req.params.id);
  sendSuccess(res, rule);
});

const createAdminShippingRule = asyncHandler(async (req, res) => {
  const rule = await createShipping(req.body);
  sendSuccess(res, rule, 201);
});

const updateAdminShippingRule = asyncHandler(async (req, res) => {
  const rule = await updateShipping(req.params.id, req.body);
  sendSuccess(res, rule);
});

const deleteAdminShippingRule = asyncHandler(async (req, res) => {
  const result = await deleteShipping(req.params.id);
  sendSuccess(res, result);
});

module.exports = {
  getAdminShippingRules,
  getAdminShippingRule,
  createAdminShippingRule,
  updateAdminShippingRule,
  deleteAdminShippingRule,
};
