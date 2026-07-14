const {
  createCoupon,
  deleteCoupon,
  getCouponById,
  listAdminCoupons,
  updateCoupon,
  validateCoupon,
} = require("../services/couponService");
const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

const validatePublicCoupon = asyncHandler(async (req, res) => {
  const result = await validateCoupon(req.body);
  sendSuccess(res, {
    valid: true,
    code: result.couponCode,
    discountType: result.coupon.discountType,
    discountValue: result.coupon.discountValue,
    discount: result.discount,
    couponId: result.couponId,
  });
});

const getAdminCoupons = asyncHandler(async (req, res) => {
  const result = await listAdminCoupons(req.query);
  sendSuccess(res, result.items, 200, result.meta);
});

const getAdminCoupon = asyncHandler(async (req, res) => {
  const coupon = await getCouponById(req.params.id);
  sendSuccess(res, coupon);
});

const createAdminCoupon = asyncHandler(async (req, res) => {
  const coupon = await createCoupon(req.body);
  sendSuccess(res, coupon, 201);
});

const updateAdminCoupon = asyncHandler(async (req, res) => {
  const coupon = await updateCoupon(req.params.id, req.body);
  sendSuccess(res, coupon);
});

const deleteAdminCoupon = asyncHandler(async (req, res) => {
  const result = await deleteCoupon(req.params.id);
  sendSuccess(res, result);
});

module.exports = {
  validatePublicCoupon,
  getAdminCoupons,
  getAdminCoupon,
  createAdminCoupon,
  updateAdminCoupon,
  deleteAdminCoupon,
};
