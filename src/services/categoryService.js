const { Category } = require("../models/Category");
const { NotFoundError } = require("../utils/ApiError");
const { buildPaginationMeta, getPagination } = require("../utils/pagination");
const { parseSort } = require("../utils/query");
const { ensureUniqueSlug } = require("../utils/slug");
const { uploadBuffer, deleteFromCloudinary, CATEGORY_IMAGE_FOLDER } = require("./uploadService");

function buildCategoryFilter(query, publicOnly = false) {
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

async function listPublicCategories(query) {
  const { page, limit, skip } = getPagination(query);
  const filter = buildCategoryFilter(query, true);
  const sort = parseSort(query.sort, { sortOrder: 1, name: 1 });

  const [items, total] = await Promise.all([
    Category.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Category.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
}

async function listAdminCategories(query) {
  const { page, limit, skip } = getPagination(query);
  const filter = buildCategoryFilter(query, false);
  const sort = parseSort(query.sort, { sortOrder: 1, createdAt: -1 });

  const [items, total] = await Promise.all([
    Category.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Category.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
}

async function getPublicCategoryBySlug(slug) {
  const category = await Category.findOne({ slug, status: "active" }).lean();
  if (!category) throw new NotFoundError("Category not found");
  return category;
}

async function getAdminCategoryById(id) {
  const category = await Category.findById(id).lean();
  if (!category) throw new NotFoundError("Category not found");
  return category;
}

async function createCategory(input, file) {
  const slug = input.slug
    ? await ensureUniqueSlug(Category, input.slug)
    : await ensureUniqueSlug(Category, input.name);

  let image = { url: "" };
  if (file) {
    image = await uploadBuffer(file.buffer, CATEGORY_IMAGE_FOLDER);
  } else if (input.image) {
    image = typeof input.image === "string" ? { url: input.image } : input.image;
  }

  return Category.create({ ...input, slug, image });
}

async function updateCategory(id, input, file) {
  const existing = await Category.findById(id);
  if (!existing) throw new NotFoundError("Category not found");

  let slug = input.slug;
  if (input.slug) {
    slug = await ensureUniqueSlug(Category, input.slug, id);
  } else if (input.name && input.name !== existing.name) {
    slug = await ensureUniqueSlug(Category, input.name, id);
  }

  const rawImage = existing.image;
  const currentPublicId = rawImage?.publicId;

  let image = rawImage || { url: "" };

  if (file) {
    if (currentPublicId) {
      await deleteFromCloudinary(currentPublicId);
    }
    image = await uploadBuffer(file.buffer, CATEGORY_IMAGE_FOLDER);
  } else if (input.image === "") {
    if (currentPublicId) {
      await deleteFromCloudinary(currentPublicId);
    }
    image = { url: "" };
  } else if (input.image && typeof input.image === "string") {
    image = { url: input.image };
  }

  const updateData = {};
  const fields = ["name", "description", "status", "sortOrder"];
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

async function deleteCategory(id) {
  const category = await Category.findById(id);
  if (!category) throw new NotFoundError("Category not found");

  const rawImage = category.image;
  if (rawImage?.publicId) {
    await deleteFromCloudinary(rawImage.publicId);
  }

  await Category.findByIdAndDelete(id);
  return { id };
}

module.exports = {
  listPublicCategories,
  listAdminCategories,
  getPublicCategoryBySlug,
  getAdminCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
