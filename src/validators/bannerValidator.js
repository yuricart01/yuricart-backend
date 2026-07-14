const { z } = require("zod");
const { paginationQuerySchema, sortQuerySchema } = require("./common");

const publicBannerQuerySchema = paginationQuerySchema.extend({
  placement: z.enum(["hero", "promo"]).optional(),
  sort: sortQuerySchema.optional(),
});

const adminBannerQuerySchema = publicBannerQuerySchema.extend({
  q: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

const createBannerSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  slug: z.string().min(1).optional(),
  image: z.string().optional(),
  link: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  sortOrder: z.coerce.number().int().optional(),
  placement: z.enum(["hero", "promo"]).optional(),
});

const updateBannerSchema = createBannerSchema.partial();

module.exports = {
  publicBannerQuerySchema,
  adminBannerQuerySchema,
  createBannerSchema,
  updateBannerSchema,
};
