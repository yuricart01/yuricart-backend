const {
  createOrder,
  getAdminOrderById,
  getUserOrders,
  listAdminOrders,
  trackOrder,
  updateOrderStatus,
} = require("../services/orderService");
const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

const createPublicOrder = asyncHandler(async (req, res) => {
  const customerId =
    req.user?.role === "customer" ? req.user.sub : undefined;
  const customerEmail =
    req.user?.role === "customer" ? req.user.email : undefined;

  const order = await createOrder(req.body, customerId, customerEmail);
  sendSuccess(res, order, 201);
});

const trackPublicOrder = asyncHandler(async (req, res) => {
  const order = await trackOrder(
    req.params.orderNumber,
    req.query.email,
  );
  sendSuccess(res, order);
});

const getMyOrders = asyncHandler(async (req, res) => {
  const result = await getUserOrders(req.user.sub, req.user.email, req.query);
  sendSuccess(res, result.items, 200, result.meta);
});

const getAdminOrders = asyncHandler(async (req, res) => {
  const result = await listAdminOrders(req.query);
  sendSuccess(res, result.items, 200, result.meta);
});

const getAdminOrder = asyncHandler(async (req, res) => {
  const order = await getAdminOrderById(req.params.id);
  sendSuccess(res, order);
});

const patchAdminOrder = asyncHandler(async (req, res) => {
  const order = await updateOrderStatus(
    req.params.id,
    req.body,
  );
  sendSuccess(res, order);
});

module.exports = {
  createPublicOrder,
  trackPublicOrder,
  getMyOrders,
  getAdminOrders,
  getAdminOrder,
  patchAdminOrder,
};
