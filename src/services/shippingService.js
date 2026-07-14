const { Shipping } = require("../models/Shipping");
const { NotFoundError } = require("../utils/ApiError");
const { buildPaginationMeta, getPagination } = require("../utils/pagination");

async function calculateShippingCost(subtotal, region) {
  const rules = await Shipping.find({ status: "active" }).sort({ rate: 1 }).lean();

  if (!rules.length) return 0;

  let matched;

  if (region) {
    const normalizedRegion = region.trim().toLowerCase();
    matched = rules.find((rule) =>
      rule.regions.some((r) => r.trim().toLowerCase() === normalizedRegion),
    );
  }

  if (!matched) {
    matched = rules.find((rule) => !rule.regions.length) || rules[0];
  }

  if (matched.freeAbove !== undefined && subtotal >= matched.freeAbove) {
    return 0;
  }

  return matched.rate;
}

async function listAdminShipping(query) {
  const { page, limit, skip } = getPagination(query);
  const filter = {};

  if (query.status) filter.status = query.status;

  const [items, total] = await Promise.all([
    Shipping.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Shipping.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
}

async function getShippingById(id) {
  const rule = await Shipping.findById(id).lean();
  if (!rule) throw new NotFoundError("Shipping rule not found");
  return rule;
}

async function createShipping(input) {
  return Shipping.create(input);
}

async function updateShipping(id, input) {
  const rule = await Shipping.findByIdAndUpdate(id, input, {
    new: true,
    runValidators: true,
  }).lean();

  if (!rule) throw new NotFoundError("Shipping rule not found");
  return rule;
}

async function deleteShipping(id) {
  const rule = await Shipping.findByIdAndDelete(id);
  if (!rule) throw new NotFoundError("Shipping rule not found");
  return { id };
}

module.exports = {
  calculateShippingCost,
  listAdminShipping,
  getShippingById,
  createShipping,
  updateShipping,
  deleteShipping,
};
