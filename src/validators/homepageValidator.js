const { z } = require("zod");
const { idParamSchema } = require("./common");

const SECTIONS = ["hero", "promo", "mobiles", "laptops", "smart", "desktop"];
const FIXED_SECTIONS = ["promo", "mobiles", "laptops", "smart", "desktop"];

const GRID_SLOTS = ["left1", "left2", "left3", "left4"];
const PROMO_SLOTS = ["1", "2", "3"];

const FIXED_SLOTS = {
  promo: PROMO_SLOTS,
  mobiles: GRID_SLOTS,
  laptops: GRID_SLOTS,
  smart: GRID_SLOTS,
  desktop: GRID_SLOTS,
};

const sectionParamSchema = z.object({
  section: z.enum(FIXED_SECTIONS),
  slot: z.string().min(1),
});

const upsertSlotSchema = z.object({
  link: z.string().optional(),
  active: z
    .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined;
      if (typeof val === "boolean") return val;
      return val === "true" || val === "1";
    }),
});

const createHeroSlideSchema = z.object({
  link: z.string().optional().default(""),
  active: z
    .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
    .optional()
    .transform((val) => {
      if (val === undefined) return true;
      if (typeof val === "boolean") return val;
      return val === "true" || val === "1";
    }),
  sortOrder: z.coerce.number().int().optional(),
});

const updateHeroSlideSchema = z.object({
  link: z.string().optional(),
  active: z
    .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined;
      if (typeof val === "boolean") return val;
      return val === "true" || val === "1";
    }),
  sortOrder: z.coerce.number().int().optional(),
});

const reorderHeroSchema = z.object({
  orderedIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).min(1),
});

const featuredSectionItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  categorySlug: z.string().nullable().optional(),
  limit: z.coerce.number().int().min(1).max(50),
  sort: z.enum(["featured", "newest", "price_asc", "price_desc"]).default("featured"),
});

const updateFeaturedSectionsSchema = z.object({
  featuredSections: z.array(featuredSectionItemSchema).min(1),
});

module.exports = {
  SECTIONS,
  FIXED_SECTIONS,
  FIXED_SLOTS,
  GRID_SLOTS,
  PROMO_SLOTS,
  sectionParamSchema,
  upsertSlotSchema,
  createHeroSlideSchema,
  updateHeroSlideSchema,
  reorderHeroSchema,
  updateFeaturedSectionsSchema,
  idParamSchema,
};
