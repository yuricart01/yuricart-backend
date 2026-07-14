const { z } = require("zod");
const { paginationQuerySchema } = require("./common");

const validateCouponSchema = z.object({
  code: z.string().min(1),
  subtotal: z.coerce.number().min(0),
});

const createCouponSchema = z.object({
  code: z.string().min(1),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.coerce.number().min(0),
  minOrderAmount: z.coerce.number().min(0).optional(),
  maxUses: z.coerce.number().int().min(1).optional(),
  expiryDate: z.coerce.date().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

const updateCouponSchema = createCouponSchema.partial();

const adminCouponQuerySchema = paginationQuerySchema.extend({
  q: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

module.exports = {
  validateCouponSchema,
  createCouponSchema,
  updateCouponSchema,
  adminCouponQuerySchema,
};
