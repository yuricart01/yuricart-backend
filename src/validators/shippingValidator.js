const { z } = require("zod");
const { paginationQuerySchema } = require("./common");

const createShippingSchema = z.object({
  name: z.string().min(1),
  rate: z.coerce.number().min(0),
  freeAbove: z.coerce.number().min(0).optional(),
  regions: z.array(z.string()).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

const updateShippingSchema = createShippingSchema.partial();

const adminShippingQuerySchema = paginationQuerySchema.extend({
  status: z.enum(["active", "inactive"]).optional(),
});

module.exports = {
  createShippingSchema,
  updateShippingSchema,
  adminShippingQuerySchema,
};
