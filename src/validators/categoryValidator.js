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
  imageAlt: z.string().max(200).optional(),
  description: z.string().optional(),
  seoTitle: z.string().max(70).optional(),
  metaDescription: z.string().max(320).optional(),
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
