const { User } = require("../models/User");
const { BadRequestError, NotFoundError } = require("../utils/ApiError");
const { buildPaginationMeta, getPagination } = require("../utils/pagination");

async function listCustomers(query) {
  const { page, limit, skip } = getPagination(query);
  const filter = { role: "customer" };

  if (query.status) filter.status = query.status;

  if (query.q) {
    filter.$or = [
      { name: { $regex: query.q, $options: "i" } },
      { email: { $regex: query.q, $options: "i" } },
      { phone: { $regex: query.q, $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
}

async function updateCustomerStatus(id, input) {
  const customer = await User.findOne({ _id: id, role: "customer" });
  if (!customer) throw new NotFoundError("Customer not found");

  if (customer.role === "admin") {
    throw new BadRequestError("Cannot modify admin users via customer endpoint");
  }

  customer.status = input.status;
  await customer.save();

  const { password: _password, ...safe } = customer.toObject();
  return safe;
}

module.exports = { listCustomers, updateCustomerStatus };
