const { z } = require("zod");
const { paginationQuerySchema } = require("./common");

const customerRegisterSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
});

const customerLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const adminCustomerQuerySchema = paginationQuerySchema.extend({
  q: z.string().optional(),
  status: z.enum(["active", "blocked"]).optional(),
});

const updateCustomerStatusSchema = z.object({
  status: z.enum(["active", "blocked"]),
});

module.exports = {
  customerRegisterSchema,
  customerLoginSchema,
  adminCustomerQuerySchema,
  updateCustomerStatusSchema,
};
