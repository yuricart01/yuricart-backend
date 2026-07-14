const { Order } = require("../models/Order");
const { Product } = require("../models/Product");
const { User } = require("../models/User");

async function getDashboardStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalOrders,
    totalRevenueResult,
    monthlyOrders,
    monthlyRevenueResult,
    totalProducts,
    activeProducts,
    totalCustomers,
    activeCustomers,
    pendingOrders,
    recentOrders,
  ] = await Promise.all([
    Order.countDocuments(),
    Order.aggregate([
      { $match: { paymentStatus: { $in: ["paid", "pending"] }, orderStatus: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth },
          paymentStatus: { $in: ["paid", "pending"] },
          orderStatus: { $ne: "cancelled" },
        },
      },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Product.countDocuments(),
    Product.countDocuments({ status: "active" }),
    User.countDocuments({ role: "customer" }),
    User.countDocuments({ role: "customer", status: "active" }),
    Order.countDocuments({ orderStatus: "pending" }),
    Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("orderNumber customerName total orderStatus paymentStatus createdAt")
      .lean(),
  ]);

  return {
    orders: {
      total: totalOrders,
      monthly: monthlyOrders,
      pending: pendingOrders,
    },
    revenue: {
      total: totalRevenueResult[0]?.total ?? 0,
      monthly: monthlyRevenueResult[0]?.total ?? 0,
    },
    products: {
      total: totalProducts,
      active: activeProducts,
    },
    customers: {
      total: totalCustomers,
      active: activeCustomers,
    },
    recentOrders,
  };
}

module.exports = { getDashboardStats };
