const { HomepageBanner } = require("../models/HomepageBanner");
const { BadRequestError, NotFoundError } = require("../utils/ApiError");
const { listPublicCategories } = require("./categoryService");
const {
  listPublicProducts,
  listProductsByCategorySlug,
} = require("./productService");
const { getSettingsByGroup, upsertSettings } = require("./settingsService");
const {
  uploadBuffer,
  deleteFromCloudinary,
  HOMEPAGE_IMAGE_FOLDER,
} = require("./uploadService");
const { FIXED_SLOTS, FIXED_SECTIONS } = require("../validators/homepageValidator");

const DEFAULT_FEATURED_SECTIONS = [
  {
    id: "mobiles",
    title: "Featured Mobiles",
    categorySlug: "phones",
    limit: 10,
    sort: "featured",
  },
  {
    id: "laptops",
    title: "Featured Laptops",
    categorySlug: "laptops",
    limit: 10,
    sort: "featured",
  },
  {
    id: "desktops",
    title: "Desktops & Accessories",
    categorySlug: "desktops",
    limit: 10,
    sort: "featured",
  },
  {
    id: "featured",
    title: "Featured Products",
    categorySlug: null,
    limit: 12,
    sort: "featured",
  },
];

function toPublicBanner(doc) {
  if (!doc) return null;
  return {
    id: String(doc._id),
    section: doc.section,
    slot: doc.slot,
    imageUrl: doc.image?.url || "",
    link: doc.link || "",
    active: doc.active !== false,
    sortOrder: doc.sortOrder ?? 0,
  };
}

function toAdminBanner(doc) {
  if (!doc) return null;
  return {
    id: String(doc._id),
    section: doc.section,
    slot: doc.slot,
    image: doc.image || { url: "" },
    imageUrl: doc.image?.url || "",
    link: doc.link || "",
    active: doc.active !== false,
    sortOrder: doc.sortOrder ?? 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function ensureFixedSlots() {
  const ops = [];
  for (const section of FIXED_SECTIONS) {
    const slots = FIXED_SLOTS[section];
    for (let i = 0; i < slots.length; i += 1) {
      ops.push({
        updateOne: {
          filter: { section, slot: slots[i] },
          update: {
            $setOnInsert: {
              section,
              slot: slots[i],
              image: { url: "" },
              link: "",
              active: true,
              sortOrder: i,
            },
          },
          upsert: true,
        },
      });
    }
  }
  if (ops.length) {
    await HomepageBanner.bulkWrite(ops, { ordered: false });
  }
}

async function getFeaturedSectionSettings() {
  const settings = await getSettingsByGroup("homepage");
  const stored = settings.featuredSections;
  if (Array.isArray(stored) && stored.length > 0) {
    return stored;
  }
  return DEFAULT_FEATURED_SECTIONS;
}

async function updateFeaturedSections(featuredSections) {
  await upsertSettings({
    settings: [
      {
        key: "featuredSections",
        value: featuredSections,
        group: "homepage",
      },
    ],
  });
  return featuredSections;
}

function mapSortToQuery(sort) {
  switch (sort) {
    case "newest":
      return { sort: "createdAt_desc" };
    case "price_asc":
      return { sort: "price_asc" };
    case "price_desc":
      return { sort: "price_desc" };
    case "featured":
    default:
      return { featured: "true", sort: "createdAt_desc" };
  }
}

async function loadFeaturedProducts(config) {
  const limit = config.limit || 10;
  const baseQuery = {
    limit,
    page: 1,
    ...mapSortToQuery(config.sort || "featured"),
  };

  async function fetchOnce(query) {
    if (config.categorySlug) {
      return listProductsByCategorySlug(config.categorySlug, query);
    }
    return listPublicProducts(query);
  }

  try {
    let result = await fetchOnce(baseQuery);
    if (!result.items.length && config.sort === "featured") {
      result = await fetchOnce({
        limit,
        page: 1,
        sort: "createdAt_desc",
      });
    }
    return result.items;
  } catch {
    if (config.categorySlug) {
      try {
        const result = await listPublicProducts({
          limit,
          page: 1,
          ...mapSortToQuery(config.sort || "featured"),
        });
        return result.items;
      } catch {
        return [];
      }
    }
    return [];
  }
}

function groupGridBanners(items, section) {
  const slots = FIXED_SLOTS[section];
  const map = {};
  for (const slot of slots) {
    map[slot] = null;
  }
  for (const item of items) {
    if (item.section === section && slots.includes(item.slot)) {
      const publicItem = toPublicBanner(item);
      if (publicItem?.imageUrl) {
        map[item.slot] = publicItem;
      } else {
        map[item.slot] = publicItem;
      }
    }
  }
  return map;
}

async function getPublicHomepage() {
  await ensureFixedSlots();

  const [banners, categoriesResult, featuredConfigs] = await Promise.all([
    HomepageBanner.find({ active: true }).sort({ sortOrder: 1, createdAt: 1 }).lean(),
    listPublicCategories({ limit: 50, sort: "sortOrder_asc" }),
    getFeaturedSectionSettings(),
  ]);

  const heroSlides = banners
    .filter((b) => b.section === "hero" && b.image?.url)
    .map(toPublicBanner);

  const promoCards = FIXED_SLOTS.promo.map((slot) => {
    const found = banners.find((b) => b.section === "promo" && b.slot === slot);
    return found ? toPublicBanner(found) : { slot, imageUrl: "", link: "", active: true };
  });

  const featuredSections = await Promise.all(
    featuredConfigs.map(async (config) => ({
      id: config.id,
      title: config.title,
      categorySlug: config.categorySlug ?? null,
      products: await loadFeaturedProducts(config),
    })),
  );

  const categories = (categoriesResult.items || []).map((cat) => ({
    id: String(cat._id),
    name: cat.name,
    slug: cat.slug,
    imageUrl: cat.image?.url || "",
  }));

  return {
    heroSlides,
    promoCards,
    mobileBanners: groupGridBanners(banners, "mobiles"),
    laptopBanners: groupGridBanners(banners, "laptops"),
    smartBanners: groupGridBanners(banners, "smart"),
    desktopBanners: groupGridBanners(banners, "desktop"),
    categories,
    featuredSections,
  };
}

async function getAdminHomepage() {
  await ensureFixedSlots();

  const [banners, featuredSections] = await Promise.all([
    HomepageBanner.find().sort({ section: 1, sortOrder: 1, createdAt: 1 }).lean(),
    getFeaturedSectionSettings(),
  ]);

  const heroSlides = banners
    .filter((b) => b.section === "hero")
    .map(toAdminBanner);

  const fixed = {};
  for (const section of FIXED_SECTIONS) {
    fixed[section] = FIXED_SLOTS[section].map((slot) => {
      const found = banners.find((b) => b.section === section && b.slot === slot);
      return found
        ? toAdminBanner(found)
        : {
            id: null,
            section,
            slot,
            image: { url: "" },
            imageUrl: "",
            link: "",
            active: true,
            sortOrder: 0,
          };
    });
  }

  return {
    heroSlides,
    promoCards: fixed.promo,
    mobileBanners: fixed.mobiles,
    laptopBanners: fixed.laptops,
    smartBanners: fixed.smart,
    desktopBanners: fixed.desktop,
    featuredSections,
  };
}

async function createHeroSlide(input, file) {
  let image = { url: "" };
  if (file) {
    image = await uploadBuffer(file.buffer, HOMEPAGE_IMAGE_FOLDER);
  }

  const maxOrder = await HomepageBanner.findOne({ section: "hero" })
    .sort({ sortOrder: -1 })
    .select("sortOrder")
    .lean();

  const sortOrder =
    input.sortOrder !== undefined
      ? input.sortOrder
      : (maxOrder?.sortOrder ?? -1) + 1;

  const slot = `hero-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const banner = await HomepageBanner.create({
    section: "hero",
    slot,
    image,
    link: input.link || "",
    active: input.active !== false,
    sortOrder,
  });

  return toAdminBanner(banner.toObject());
}

async function updateHeroSlide(id, input, file) {
  const existing = await HomepageBanner.findOne({ _id: id, section: "hero" });
  if (!existing) throw new NotFoundError("Hero slide not found");

  if (file) {
    if (existing.image?.publicId) {
      await deleteFromCloudinary(existing.image.publicId);
    }
    existing.image = await uploadBuffer(file.buffer, HOMEPAGE_IMAGE_FOLDER);
  }

  if (input.link !== undefined) existing.link = input.link;
  if (input.active !== undefined) existing.active = input.active;
  if (input.sortOrder !== undefined) existing.sortOrder = input.sortOrder;

  await existing.save();
  return toAdminBanner(existing.toObject());
}

async function deleteHeroSlide(id) {
  const existing = await HomepageBanner.findOne({ _id: id, section: "hero" });
  if (!existing) throw new NotFoundError("Hero slide not found");

  if (existing.image?.publicId) {
    await deleteFromCloudinary(existing.image.publicId);
  }

  await HomepageBanner.findByIdAndDelete(id);
  return { id };
}

async function reorderHeroSlides(orderedIds) {
  const ops = orderedIds.map((id, index) => ({
    updateOne: {
      filter: { _id: id, section: "hero" },
      update: { $set: { sortOrder: index } },
    },
  }));
  await HomepageBanner.bulkWrite(ops);
  const slides = await HomepageBanner.find({ section: "hero" })
    .sort({ sortOrder: 1 })
    .lean();
  return slides.map(toAdminBanner);
}

async function upsertFixedSlot(section, slot, input, file) {
  if (!FIXED_SECTIONS.includes(section)) {
    throw new BadRequestError("Invalid section");
  }
  const allowed = FIXED_SLOTS[section];
  if (!allowed.includes(slot)) {
    throw new BadRequestError(`Invalid slot "${slot}" for section "${section}"`);
  }

  let existing = await HomepageBanner.findOne({ section, slot });
  if (!existing) {
    existing = new HomepageBanner({
      section,
      slot,
      image: { url: "" },
      link: "",
      active: true,
      sortOrder: allowed.indexOf(slot),
    });
  }

  if (file) {
    if (existing.image?.publicId) {
      await deleteFromCloudinary(existing.image.publicId);
    }
    existing.image = await uploadBuffer(file.buffer, HOMEPAGE_IMAGE_FOLDER);
  }

  if (input.link !== undefined) existing.link = input.link;
  if (input.active !== undefined) existing.active = input.active;

  await existing.save();
  return toAdminBanner(existing.toObject());
}

module.exports = {
  DEFAULT_FEATURED_SECTIONS,
  getPublicHomepage,
  getAdminHomepage,
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
  reorderHeroSlides,
  upsertFixedSlot,
  getFeaturedSectionSettings,
  updateFeaturedSections,
  ensureFixedSlots,
};
