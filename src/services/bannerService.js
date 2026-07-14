const { Banner } = require("../models/Banner");
const { NotFoundError } = require("../utils/ApiError");
const { buildPaginationMeta, getPagination } = require("../utils/pagination");
const { parseSort } = require("../utils/query");
const { ensureUniqueSlug } = require("../utils/slug");
const { uploadBuffer, deleteFromCloudinary, BANNER_IMAGE_FOLDER } = require("./uploadService");

function buildBannerFilter(query, publicOnly = false) {
  const filter = {};

  if (publicOnly) {
    filter.status = "active";
  } else if ("status" in query && query.status) {
    filter.status = query.status;
  }

  if (query.placement) {
    filter.placement = query.placement;
  }

  if ("q" in query && query.q) {
    filter.$or = [
      { title: { $regex: query.q, $options: "i" } },
      { subtitle: { $regex: query.q, $options: "i" } },
    ];
  }

  return filter;
}

async function listPublicBanners(query) {
  const { page, limit, skip } = getPagination(query);
  const filter = buildBannerFilter(query, true);
  const sort = parseSort(query.sort, { sortOrder: 1, createdAt: -1 });

  const [items, total] = await Promise.all([
    Banner.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Banner.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
}

async function listAdminBanners(query) {
  const { page, limit, skip } = getPagination(query);
  const filter = buildBannerFilter(query, false);
  const sort = parseSort(query.sort, { sortOrder: 1, createdAt: -1 });

  const [items, total] = await Promise.all([
    Banner.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Banner.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
}

async function getPublicBannerBySlug(slug) {
  const banner = await Banner.findOne({ slug, status: "active" }).lean();
  if (!banner) throw new NotFoundError("Banner not found");
  return banner;
}

async function getAdminBannerById(id) {
  const banner = await Banner.findById(id).lean();
  if (!banner) throw new NotFoundError("Banner not found");
  return banner;
}

async function createBanner(input, file) {
  const slug = input.slug
    ? await ensureUniqueSlug(Banner, input.slug)
    : await ensureUniqueSlug(Banner, input.title);

  let image = { url: "" };
  if (file) {
    image = await uploadBuffer(file.buffer, BANNER_IMAGE_FOLDER);
  } else if (input.image) {
    image = typeof input.image === "string" ? { url: input.image } : input.image;
  }

  return Banner.create({ ...input, slug, image });
}

async function updateBanner(id, input, file) {
  const existing = await Banner.findById(id);
  if (!existing) throw new NotFoundError("Banner not found");

  let slug = input.slug;
  if (input.slug) {
    slug = await ensureUniqueSlug(Banner, input.slug, id);
  } else if (input.title && input.title !== existing.title) {
    slug = await ensureUniqueSlug(Banner, input.title, id);
  }

  const rawImage = existing.image;
  const currentPublicId = rawImage?.publicId;

  let image = rawImage || { url: "" };

  if (file) {
    if (currentPublicId) {
      await deleteFromCloudinary(currentPublicId);
    }
    image = await uploadBuffer(file.buffer, BANNER_IMAGE_FOLDER);
  } else if (input.image === "") {
    if (currentPublicId) {
      await deleteFromCloudinary(currentPublicId);
    }
    image = { url: "" };
  } else if (input.image && typeof input.image === "string") {
    image = { url: input.image };
  }

  const updateData = {};
  const fields = ["title", "subtitle", "link", "status", "sortOrder", "placement"];
  for (const field of fields) {
    if (field in input) {
      updateData[field] = input[field];
    }
  }

  Object.assign(existing, {
    ...updateData,
    ...(slug ? { slug } : {}),
    image,
  });
  await existing.save();
  return existing.toObject();
}

async function deleteBanner(id) {
  const banner = await Banner.findById(id);
  if (!banner) throw new NotFoundError("Banner not found");

  const rawImage = banner.image;
  if (rawImage?.publicId) {
    await deleteFromCloudinary(rawImage.publicId);
  }

  await Banner.findByIdAndDelete(id);
  return { id };
}

module.exports = {
  listPublicBanners,
  listAdminBanners,
  getPublicBannerBySlug,
  getAdminBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
};
