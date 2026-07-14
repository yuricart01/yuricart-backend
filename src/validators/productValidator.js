const { z } = require("zod");
const {
  booleanStringSchema,
  imageSchema,
  paginationQuerySchema,
  productVariantSchema,
  sortQuerySchema,
} = require("./common");

const publicProductQuerySchema = paginationQuerySchema.extend({
  q: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: sortQuerySchema.optional(),
  featured: booleanStringSchema,
  newArrival: booleanStringSchema,
  bestSeller: booleanStringSchema,
  tags: z.string().optional(),
});

const adminProductQuerySchema = publicProductQuerySchema.extend({
  status: z.enum(["draft", "active", "archived"]).optional(),
});

const createProductSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  price: z.coerce.number().min(0),
  salePrice: z.coerce.number().min(0).optional(),
  sku: z.string().optional(),
  stock: z.coerce.number().int().min(0).optional(),
  category: z.string().regex(/^[0-9a-fA-F]{24}$/).optional().nullable(),
  brand: z.string().regex(/^[0-9a-fA-F]{24}$/).optional().nullable(),
  images: z.array(imageSchema).optional(),
  tags: z.array(z.string()).optional(),
  colors: z.array(z.string()).optional(),
  sizes: z.array(z.string()).optional(),
  variants: z.array(productVariantSchema).optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  featured: z.boolean().optional(),
  newArrival: z.boolean().optional(),
  bestSeller: z.boolean().optional(),
  ribbon: z.string().optional(),
  currency: z.string().length(3).optional(),
});

const updateProductSchema = createProductSchema.partial();

module.exports = {
  publicProductQuerySchema,
  adminProductQuerySchema,
  createProductSchema,
  updateProductSchema,
};
