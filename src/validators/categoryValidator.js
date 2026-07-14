const { z } = require("zod");
const { paginationQuerySchema, sortQuerySchema } = require("./common");

const publicCategoryQuerySchema = paginationQuerySchema.extend({
  q: z.string().optional(),
  sort: sortQuerySchema.optional(),
});

const adminCategoryQuerySchema = publicCategoryQuerySchema.extend({
  status: z.enum(["active", "inactive"]).optional(),
});

const createCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  image: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  sortOrder: z.coerce.number().int().optional(),
});

const updateCategorySchema = createCategorySchema.partial();

module.exports = {
  publicCategoryQuerySchema,
  adminCategoryQuerySchema,
  createCategorySchema,
  updateCategorySchema,
};
