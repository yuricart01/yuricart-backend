const { listCustomers, updateCustomerStatus } = require("../services/customerService");
const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

const getAdminCustomers = asyncHandler(async (req, res) => {
  const result = await listCustomers(req.query);
  sendSuccess(res, result.items, 200, result.meta);
});

const patchAdminCustomer = asyncHandler(async (req, res) => {
  const customer = await updateCustomerStatus(
    req.params.id,
    req.body,
  );
  sendSuccess(res, customer);
});

module.exports = { getAdminCustomers, patchAdminCustomer };
