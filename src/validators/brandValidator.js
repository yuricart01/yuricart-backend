const { z } = require("zod");
const { paginationQuerySchema, sortQuerySchema } = require("./common");

const publicBrandQuerySchema = paginationQuerySchema.extend({
  q: z.string().optional(),
  sort: sortQuerySchema.optional(),
});

const adminBrandQuerySchema = publicBrandQuerySchema.extend({
  status: z.enum(["active", "inactive"]).optional(),
});

const createBrandSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  logo: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

const updateBrandSchema = createBrandSchema.partial();

module.exports = {
  publicBrandQuerySchema,
  adminBrandQuerySchema,
  createBrandSchema,
  updateBrandSchema,
};
