const { Brand } = require("../models/Brand");
const { NotFoundError } = require("../utils/ApiError");
const { buildPaginationMeta, getPagination } = require("../utils/pagination");
const { parseSort } = require("../utils/query");
const { ensureUniqueSlug } = require("../utils/slug");
const { uploadBuffer, deleteFromCloudinary, BRAND_IMAGE_FOLDER } = require("./uploadService");

function buildBrandFilter(query, publicOnly = false) {
  const filter = {};

  if (publicOnly) {
    filter.status = "active";
  } else if ("status" in query && query.status) {
    filter.status = query.status;
  }

  if (query.q) {
    filter.$text = { $search: query.q };
  }

  return filter;
}

async function listPublicBrands(query) {
  const { page, limit, skip } = getPagination(query);
  const filter = buildBrandFilter(query, true);
  const sort = parseSort(query.sort, { name: 1 });

  const [items, total] = await Promise.all([
    Brand.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Brand.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
}

async function listAdminBrands(query) {
  const { page, limit, skip } = getPagination(query);
  const filter = buildBrandFilter(query, false);
  const sort = parseSort(query.sort, { name: 1, createdAt: -1 });

  const [items, total] = await Promise.all([
    Brand.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Brand.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
}

async function getPublicBrandBySlug(slug) {
  const brand = await Brand.findOne({ slug, status: "active" }).lean();
  if (!brand) throw new NotFoundError("Brand not found");
  return brand;
}

async function getAdminBrandById(id) {
  const brand = await Brand.findById(id).lean();
  if (!brand) throw new NotFoundError("Brand not found");
  return brand;
}

async function createBrand(input, file) {
  const slug = input.slug
    ? await ensureUniqueSlug(Brand, input.slug)
    : await ensureUniqueSlug(Brand, input.name);

  let image = { url: "" };
  if (file) {
    image = await uploadBuffer(file.buffer, BRAND_IMAGE_FOLDER);
  } else if (input.image) {
    image = typeof input.image === "string" ? { url: input.image } : input.image;
  } else if (input.logo) {
    image = { url: input.logo };
  }

  return Brand.create({ ...input, slug, image });
}

async function updateBrand(id, input, file) {
  const existing = await Brand.findById(id);
  if (!existing) throw new NotFoundError("Brand not found");

  let slug = input.slug;
  if (input.slug) {
    slug = await ensureUniqueSlug(Brand, input.slug, id);
  } else if (input.name && input.name !== existing.name) {
    slug = await ensureUniqueSlug(Brand, input.name, id);
  }

  const rawImage = existing.image;
  const currentPublicId = rawImage?.publicId;

  let image = rawImage || { url: "" };

  if (file) {
    if (currentPublicId) {
      await deleteFromCloudinary(currentPublicId);
    }
    image = await uploadBuffer(file.buffer, BRAND_IMAGE_FOLDER);
  } else if (input.image === "") {
    if (currentPublicId) {
      await deleteFromCloudinary(currentPublicId);
    }
    image = { url: "" };
  } else if (input.image && typeof input.image === "string") {
    image = { url: input.image };
  } else if (input.logo && typeof input.logo === "string") {
    image = { url: input.logo };
  }

  const updateData = {};
  const fields = ["name", "status"];
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

async function deleteBrand(id) {
  const brand = await Brand.findById(id);
  if (!brand) throw new NotFoundError("Brand not found");

  const rawImage = brand.image;
  if (rawImage?.publicId) {
    await deleteFromCloudinary(rawImage.publicId);
  }

  await Brand.findByIdAndDelete(id);
  return { id };
}

module.exports = {
  listPublicBrands,
  listAdminBrands,
  getPublicBrandBySlug,
  getAdminBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
};
