const { z } = require("zod");

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const slugParamSchema = z.object({
  slug: z.string().min(1),
});

const idParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID"),
});

const sortQuerySchema = z.enum([
  "createdAt_desc",
  "createdAt_asc",
  "updatedAt_desc",
  "updatedAt_asc",
  "price_asc",
  "price_desc",
  "title_asc",
  "title_desc",
  "name_asc",
  "name_desc",
  "sortOrder_asc",
  "sortOrder_desc",
]);

const booleanStringSchema = z.enum(["true", "false", "1", "0"]).optional();

const imageSchema = z.object({
  url: z.string().url().or(z.string().min(1)),
  alt: z.string().optional(),
  publicId: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

const productVariantSchema = z.object({
  sku: z.string().optional(),
  options: z.record(z.string()).optional(),
  price: z.coerce.number().min(0).optional(),
  salePrice: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().int().min(0).optional(),
});

module.exports = {
  paginationQuerySchema,
  slugParamSchema,
  idParamSchema,
  sortQuerySchema,
  booleanStringSchema,
  imageSchema,
  productVariantSchema,
};
