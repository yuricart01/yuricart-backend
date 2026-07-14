const { Order } = require("../models/Order");
const { Product } = require("../models/Product");
const { BadRequestError, NotFoundError, UnauthorizedError } = require("../utils/ApiError");
const { buildPaginationMeta, getPagination } = require("../utils/pagination");
const { parseSort } = require("../utils/query");
const { incrementCouponUsage, validateCoupon } = require("./couponService");
const { calculateShippingCost } = require("./shippingService");
const { sendOrderConfirmationEmail, sendOrderStatusEmail } = require("./emailService");

function getProductPrice(product) {
  return product.salePrice ?? product.price;
}

function matchVariant(variants, options) {
  if (!options || !Object.keys(options).length) return undefined;

  return variants.find((variant) => {
    if (!variant.options) return false;
    const variantOptions =
      variant.options instanceof Map
        ? Object.fromEntries(variant.options)
        : variant.options;

    return Object.entries(options).every(
      ([key, value]) => variantOptions[key]?.toLowerCase() === value.toLowerCase(),
    );
  });
}

function getPrimaryImage(product) {
  const images = product.images;
  if (!images) return undefined;
  if (Array.isArray(images)) {
    const primary = images.find((img) => img.isPrimary);
    return primary?.url || images[0]?.url;
  }
  return images?.primary?.url || undefined;
}

async function generateOrderNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `YC-${dateStr}-`;

  const lastOrder = await Order.findOne({
    orderNumber: new RegExp(`^${prefix}`),
  })
    .sort({ orderNumber: -1 })
    .select("orderNumber")
    .lean();

  let seq = 1;
  if (lastOrder?.orderNumber) {
    const match = lastOrder.orderNumber.match(/(\d+)$/);
    if (match) seq = parseInt(match[1], 10) + 1;
  }

  return `${prefix}${String(seq).padStart(4, "0")}`;
}

async function resolveLineItems(items) {
  const lineItems = [];
  let subtotal = 0;

  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product || product.status !== "active") {
      throw new BadRequestError(`Product not available: ${item.productId}`);
    }

    const variant = matchVariant(product.variants, item.options);
    const unitPrice = variant?.salePrice ?? variant?.price ?? getProductPrice(product);
    const availableStock = variant?.stock ?? product.stock;

    if (availableStock < item.quantity) {
      throw new BadRequestError(
        `Insufficient stock for "${product.title}". Available: ${availableStock}`,
      );
    }

    const lineTotal = unitPrice * item.quantity;
    subtotal += lineTotal;

    const variantIndex =
      variant !== undefined ? product.variants.indexOf(variant) : undefined;

    lineItems.push({
      orderItem: {
        productId: product._id,
        title: product.title,
        slug: product.slug,
        sku: variant?.sku || product.sku,
        image: getPrimaryImage(product),
        price: unitPrice,
        quantity: item.quantity,
        options: item.options,
      },
      stockUpdates: [
        {
          productId: product._id.toString(),
          variantIndex: variantIndex !== undefined && variantIndex >= 0 ? variantIndex : undefined,
          quantity: item.quantity,
        },
      ],
    });
  }

  return { lineItems, subtotal };
}

async function applyStockUpdates(stockUpdates) {
  for (const update of stockUpdates) {
    const product = await Product.findById(update.productId);
    if (!product) continue;

    if (update.variantIndex !== undefined) {
      const variant = product.variants[update.variantIndex];
      if (variant) {
        variant.stock = Math.max(0, (variant.stock ?? 0) - update.quantity);
      }
    } else {
      product.stock = Math.max(0, product.stock - update.quantity);
    }

    await product.save();
  }
}

async function createOrder(input, customerId, customerEmail) {
  const { lineItems, subtotal } = await resolveLineItems(input.items);

  let discount = 0;
  let couponId;
  let couponCode;

  if (input.couponCode) {
    const couponResult = await validateCoupon({
      code: input.couponCode,
      subtotal,
    });
    discount = couponResult.discount;
    couponId = couponResult.couponId;
    couponCode = couponResult.couponCode;
  }

  const region = input.shippingRegion || input.county || input.city;
  const shipping = await calculateShippingCost(subtotal, region);
  const total = Math.max(0, subtotal + shipping - discount);

  const orderNumber = await generateOrderNumber();

  const order = await Order.create({
    orderNumber,
    customer: customerId || undefined,
    customerName: input.customerName,
    email: (customerEmail || input.email).toLowerCase(),
    phone: input.phone,
    address: input.address,
    city: input.city,
    county: input.county,
    postalCode: input.postalCode,
    items: lineItems.map((li) => li.orderItem),
    subtotal,
    shipping,
    discount,
    total,
    couponCode,
    couponId,
    paymentMethod: input.paymentMethod,
    paymentStatus: "pending",
    orderStatus: "pending",
    notes: input.notes,
  });

  const allStockUpdates = lineItems.flatMap((li) => li.stockUpdates);
  await applyStockUpdates(allStockUpdates);

  if (couponId) {
    await incrementCouponUsage(couponId);
  }

  sendOrderConfirmationEmail(order.toObject()).catch((err) =>
    console.error("Failed to send order confirmation email:", err.message),
  );

  return order.toObject();
}

async function getOrderByNumber(orderNumber) {
  const order = await Order.findOne({ orderNumber })
    .populate("customer", "name email phone")
    .lean();

  if (!order) throw new NotFoundError("Order not found");
  return order;
}

async function trackOrder(orderNumber, email) {
  const order = await Order.findOne({
    orderNumber,
    email: email.toLowerCase(),
  })
    .select(
      "orderNumber orderStatus paymentStatus paymentMethod trackingNumber items subtotal shipping discount total createdAt updatedAt",
    )
    .lean();

  if (!order) {
    throw new NotFoundError("Order not found. Check order number and email.");
  }

  return order;
}

async function getUserOrders(userId, userEmail, query) {
  const { page, limit, skip } = getPagination(query);
  const filter = {
    $or: [{ customer: userId }, { email: userEmail }],
  };

  const [items, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
}

function buildAdminOrderFilter(query) {
  const filter = {};

  if (query.orderStatus) filter.orderStatus = query.orderStatus;
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  if (query.paymentMethod) filter.paymentMethod = query.paymentMethod;

  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = query.from;
    if (query.to) filter.createdAt.$lte = query.to;
  }

  if (query.q) {
    filter.$or = [
      { orderNumber: { $regex: query.q, $options: "i" } },
      { customerName: { $regex: query.q, $options: "i" } },
      { email: { $regex: query.q, $options: "i" } },
      { phone: { $regex: query.q, $options: "i" } },
    ];
  }

  return filter;
}

async function listAdminOrders(query) {
  const { page, limit, skip } = getPagination(query);
  const filter = buildAdminOrderFilter(query);
  const sort = parseSort(query.sort, { createdAt: -1 });

  const [items, total] = await Promise.all([
    Order.find(filter)
      .populate("customer", "name email phone")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
}

async function getAdminOrderById(id) {
  const order = await Order.findById(id)
    .populate("customer", "name email phone status")
    .populate("couponId", "code discountType discountValue")
    .lean();

  if (!order) throw new NotFoundError("Order not found");
  return order;
}

async function updateOrderStatus(id, input) {
  const order = await Order.findById(id);
  if (!order) throw new NotFoundError("Order not found");

  const previousStatus = order.orderStatus;

  if (input.orderStatus) order.orderStatus = input.orderStatus;
  if (input.paymentStatus) order.paymentStatus = input.paymentStatus;
  if (input.trackingNumber !== undefined) order.trackingNumber = input.trackingNumber;
  if (input.mpesaReceiptNumber !== undefined) {
    order.mpesaReceiptNumber = input.mpesaReceiptNumber;
  }
  if (input.notes !== undefined) order.notes = input.notes;

  await order.save();

  const updatedOrder = await Order.findById(order._id)
    .populate("customer", "name email phone")
    .lean();

  if (input.orderStatus && input.orderStatus !== previousStatus) {
    sendOrderStatusEmail(updatedOrder, input.orderStatus).catch((err) =>
      console.error("Failed to send order status email:", err.message),
    );
  }

  return updatedOrder;
}

async function assertOrderBelongsToUser(orderId, userId) {
  const order = await Order.findById(orderId);
  if (!order) throw new NotFoundError("Order not found");

  if (!order.customer || order.customer.toString() !== userId) {
    throw new UnauthorizedError("You do not have access to this order");
  }

  return order;
}

module.exports = {
  createOrder,
  getOrderByNumber,
  trackOrder,
  getUserOrders,
  listAdminOrders,
  getAdminOrderById,
  updateOrderStatus,
  assertOrderBelongsToUser,
};
