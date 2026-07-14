const { Coupon } = require("../models/Coupon");
const { BadRequestError, NotFoundError } = require("../utils/ApiError");
const { buildPaginationMeta, getPagination } = require("../utils/pagination");

function normalizeCode(code) {
  return code.trim().toUpperCase();
}

function assertCouponUsable(coupon, subtotal) {
  if (coupon.status !== "active") {
    throw new BadRequestError("Coupon is not active");
  }

  if (coupon.expiryDate && coupon.expiryDate < new Date()) {
    throw new BadRequestError("Coupon has expired");
  }

  if (coupon.maxUses !== undefined && coupon.usedCount >= coupon.maxUses) {
    throw new BadRequestError("Coupon usage limit reached");
  }

  if (subtotal < coupon.minOrderAmount) {
    throw new BadRequestError(
      `Minimum order amount of ${coupon.minOrderAmount} required for this coupon`,
    );
  }
}

function calculateDiscount(coupon, subtotal) {
  if (coupon.discountType === "percentage") {
    return Math.min(subtotal, (subtotal * coupon.discountValue) / 100);
  }
  return Math.min(subtotal, coupon.discountValue);
}

async function validateCoupon(input) {
  const code = normalizeCode(input.code);
  const coupon = await Coupon.findOne({ code });

  if (!coupon) {
    throw new NotFoundError("Coupon not found");
  }

  assertCouponUsable(coupon, input.subtotal);

  const discount = calculateDiscount(coupon, input.subtotal);

  return {
    coupon: coupon.toObject(),
    discount,
    couponId: coupon._id.toString(),
    couponCode: coupon.code,
  };
}

async function listAdminCoupons(query) {
  const { page, limit, skip } = getPagination(query);
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.q) {
    filter.code = { $regex: query.q, $options: "i" };
  }

  const [items, total] = await Promise.all([
    Coupon.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Coupon.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
}

async function getCouponById(id) {
  const coupon = await Coupon.findById(id).lean();
  if (!coupon) throw new NotFoundError("Coupon not found");
  return coupon;
}

async function createCoupon(input) {
  const code = normalizeCode(input.code);
  const existing = await Coupon.findOne({ code });
  if (existing) {
    throw new BadRequestError("Coupon code already exists");
  }

  return Coupon.create({ ...input, code });
}

async function updateCoupon(id, input) {
  const coupon = await Coupon.findById(id);
  if (!coupon) throw new NotFoundError("Coupon not found");

  if (input.code) {
    const code = normalizeCode(input.code);
    const existing = await Coupon.findOne({ code, _id: { $ne: id } });
    if (existing) {
      throw new BadRequestError("Coupon code already exists");
    }
    coupon.code = code;
  }

  Object.assign(coupon, {
    ...input,
    ...(input.code ? { code: normalizeCode(input.code) } : {}),
  });

  await coupon.save();
  return coupon.toObject();
}

async function deleteCoupon(id) {
  const coupon = await Coupon.findByIdAndDelete(id);
  if (!coupon) throw new NotFoundError("Coupon not found");
  return { id };
}

async function incrementCouponUsage(couponId) {
  await Coupon.findByIdAndUpdate(couponId, { $inc: { usedCount: 1 } });
}

module.exports = {
  validateCoupon,
  listAdminCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  incrementCouponUsage,
  calculateDiscount,
};
