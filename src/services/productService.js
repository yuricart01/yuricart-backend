const mongoose = require("mongoose");
const { Brand } = require("../models/Brand");
const { Category } = require("../models/Category");
const { Product } = require("../models/Product");
const { NotFoundError } = require("../utils/ApiError");
const { buildPaginationMeta, getPagination } = require("../utils/pagination");
const { parseBoolean, parseSort } = require("../utils/query");
const { ensureUniqueSlug } = require("../utils/slug");
const { uploadBuffer, uploadVideoBuffer, deleteFromCloudinary, deleteMultipleFromCloudinary, PRODUCT_IMAGE_FOLDER, GALLERY_IMAGE_FOLDER, PRODUCT_VIDEO_FOLDER } = require("./uploadService");

const productPopulate = [
  { path: "category", select: "name slug image status" },
  { path: "brand", select: "name slug logo status" },
];

async function resolveCategoryRef(value, activeOnly = true) {
  if (!value) return undefined;

  const query = mongoose.Types.ObjectId.isValid(value)
    ? { _id: value }
    : { slug: value };

  if (activeOnly) query.status = "active";

  const category = await Category.findOne(query).select("_id");
  return category?._id;
}

async function resolveBrandRef(value, activeOnly = true) {
  if (!value) return undefined;

  const query = mongoose.Types.ObjectId.isValid(value)
    ? { _id: value }
    : { slug: value };

  if (activeOnly) query.status = "active";

  const brand = await Brand.findOne(query).select("_id");
  return brand?._id;
}

async function buildProductFilter(query, options = {}) {
  const filter = {};

  if (options.publicOnly) {
    filter.status = "active";
  } else if ("status" in query && query.status) {
    filter.status = query.status;
  }

  if (query.q) {
    filter.$text = { $search: query.q };
  }

  if (query.category) {
    const categoryId = await resolveCategoryRef(query.category, options.publicOnly);
    if (categoryId) filter.category = categoryId;
  }

  if (query.brand) {
    const brandId = await resolveBrandRef(query.brand, options.publicOnly);
    if (brandId) filter.brand = brandId;
  }

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.price = {};
    if (query.minPrice !== undefined) filter.price.$gte = query.minPrice;
    if (query.maxPrice !== undefined) filter.price.$lte = query.maxPrice;
  }

  const featured = parseBoolean(query.featured);
  if (featured !== undefined) filter.featured = featured;

  const newArrival = parseBoolean(query.newArrival);
  if (newArrival !== undefined) filter.newArrival = newArrival;

  const bestSeller = parseBoolean(query.bestSeller);
  if (bestSeller !== undefined) filter.bestSeller = bestSeller;

  if (query.tags) {
    filter.tags = { $in: query.tags.split(",").map((tag) => tag.trim()).filter(Boolean) };
  }

  return filter;
}

async function uploadProductImages(files, existingImages) {
  const images = {
    primary: existingImages?.primary || { url: "" },
    gallery: existingImages?.gallery || [],
  };

  if (files?.primaryImage?.[0]) {
    if (existingImages?.primary?.publicId) {
      await deleteFromCloudinary(existingImages.primary.publicId);
    }
    const result = await uploadBuffer(
      files.primaryImage[0].buffer,
      PRODUCT_IMAGE_FOLDER,
      "product",
    );
    images.primary = {
      ...result,
      alt: existingImages?.primary?.alt || "",
    };
  }

  if (files?.galleryImages?.length) {
    const uploaded = await Promise.all(
      files.galleryImages.map((file) =>
        uploadBuffer(file.buffer, GALLERY_IMAGE_FOLDER, "gallery"),
      ),
    );
    images.gallery = [
      ...images.gallery,
      ...uploaded.map((img) => ({ ...img, alt: "" })),
    ];
  }

  return images;
}

function parseGalleryAlts(raw) {
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return {};
    }
  }
  return {};
}

function parseNewGalleryAlts(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((v) => String(v || ""));
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v || ""));
    } catch {
      return raw ? [raw] : [];
    }
  }
  return [];
}

function applyImageAlts(images, input, newlyUploadedCount = 0) {
  const next = {
    primary: { ...(images.primary || { url: "" }) },
    gallery: (images.gallery || []).map((img) => ({ ...img })),
  };

  if (typeof input.primaryImageAlt === "string") {
    next.primary.alt = input.primaryImageAlt.trim();
  }

  const galleryAlts = parseGalleryAlts(input.galleryAlts);
  for (const img of next.gallery) {
    if (img.publicId && Object.prototype.hasOwnProperty.call(galleryAlts, img.publicId)) {
      img.alt = String(galleryAlts[img.publicId] || "").trim();
    }
  }

  const newAlts = parseNewGalleryAlts(input.newGalleryAlts);
  if (newlyUploadedCount > 0 && newAlts.length > 0) {
    const start = next.gallery.length - newlyUploadedCount;
    for (let i = 0; i < newlyUploadedCount; i += 1) {
      const idx = start + i;
      if (idx >= 0 && idx < next.gallery.length && newAlts[i] !== undefined) {
        next.gallery[idx].alt = String(newAlts[i] || "").trim();
      }
    }
  }

  return next;
}

async function resolveProductVideo(files, existingVideo, removeVideo = false) {
  if (removeVideo && !files?.productVideo?.[0]) {
    if (existingVideo?.publicId) {
      await deleteFromCloudinary(existingVideo.publicId, "video");
    }
    return { url: "" };
  }

  if (files?.productVideo?.[0]) {
    if (existingVideo?.publicId) {
      await deleteFromCloudinary(existingVideo.publicId, "video");
    }
    return uploadVideoBuffer(files.productVideo[0].buffer, PRODUCT_VIDEO_FOLDER);
  }

  return existingVideo?.url
    ? existingVideo
    : { url: "" };
}

async function listPublicProducts(query) {
  const { page, limit, skip } = getPagination(query);
  const filter = await buildProductFilter(query, { publicOnly: true });
  const defaultSort = (
    query.q ? { score: { $meta: "textScore" } } : { createdAt: -1 }
  );
  const sort = parseSort(query.sort, defaultSort);

  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate(productPopulate)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
}

async function listAdminProducts(query) {
  const { page, limit, skip } = getPagination(query);
  const filter = await buildProductFilter(query, { publicOnly: false });
  const defaultSort = (
    query.q ? { score: { $meta: "textScore" } } : { createdAt: -1 }
  );
  const sort = parseSort(query.sort, defaultSort);

  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate(productPopulate)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
}

async function getPublicProductBySlug(slug) {
  const product = await Product.findOne({ slug, status: "active" })
    .populate(productPopulate)
    .lean();

  if (!product) throw new NotFoundError("Product not found");
  return product;
}

async function getAdminProductById(id) {
  const product = await Product.findById(id).populate(productPopulate).lean();
  if (!product) throw new NotFoundError("Product not found");
  return product;
}

async function createProduct(input, files) {
  const slug = input.slug
    ? await ensureUniqueSlug(Product, input.slug)
    : await ensureUniqueSlug(Product, input.title);

  let images = await uploadProductImages(files);
  const newGalleryCount = files?.galleryImages?.length || 0;
  images = applyImageAlts(images, input, newGalleryCount);
  const video = await resolveProductVideo(files, null, false);

  const product = await Product.create({
    title: input.title,
    slug,
    description: input.description,
    shortDescription: input.shortDescription,
    seoTitle: input.seoTitle,
    metaDescription: input.metaDescription,
    price: input.price,
    salePrice: input.salePrice,
    sku: input.sku,
    stock: input.stock,
    category: input.category || undefined,
    brand: input.brand || undefined,
    images,
    video,
    tags: input.tags,
    colors: input.colors,
    sizes: input.sizes,
    variants: input.variants,
    status: input.status,
    featured: input.featured,
    newArrival: input.newArrival,
    bestSeller: input.bestSeller,
    ribbon: input.ribbon,
    currency: input.currency,
  });

  return Product.findById(product._id).populate(productPopulate).lean();
}

async function updateProduct(id, input, files, removedGalleryPublicIds = [], removeVideo = false) {
  const existing = await Product.findById(id);
  if (!existing) throw new NotFoundError("Product not found");

  let slug;
  if (input.slug) {
    slug = await ensureUniqueSlug(Product, input.slug, id);
  } else if (input.title && input.title !== existing.title) {
    slug = await ensureUniqueSlug(Product, input.title, id);
  }

  const existingImages = existing.images;
  let keptGallery = existingImages?.gallery || [];

  if (removedGalleryPublicIds.length > 0) {
    await deleteMultipleFromCloudinary(removedGalleryPublicIds);
    keptGallery = keptGallery.filter(
      (img) => !removedGalleryPublicIds.includes(img.publicId || ""),
    );
  }

  const images = {
    primary: existingImages?.primary || { url: "" },
    gallery: keptGallery,
  };

  if (files?.primaryImage?.[0]) {
    if (existingImages?.primary?.publicId) {
      await deleteFromCloudinary(existingImages.primary.publicId);
    }
    const result = await uploadBuffer(
      files.primaryImage[0].buffer,
      PRODUCT_IMAGE_FOLDER,
      "product",
    );
    images.primary = {
      ...result,
      alt: existingImages?.primary?.alt || "",
    };
  }

  const newGalleryCount = files?.galleryImages?.length || 0;
  if (newGalleryCount > 0) {
    const uploaded = await Promise.all(
      files.galleryImages.map((file) =>
        uploadBuffer(file.buffer, GALLERY_IMAGE_FOLDER, "gallery"),
      ),
    );
    images.gallery = [
      ...images.gallery,
      ...uploaded.map((img) => ({ ...img, alt: "" })),
    ];
  }

  const imagesWithAlts = applyImageAlts(images, input, newGalleryCount);

  const video = await resolveProductVideo(
    files,
    existing.video,
    removeVideo,
  );

  const updateData = {};
  const fields = [
    "title", "description", "shortDescription", "seoTitle", "metaDescription",
    "price", "salePrice", "sku", "stock", "tags", "colors", "sizes", "variants",
    "status", "featured", "newArrival", "bestSeller", "ribbon", "currency",
  ];
  for (const field of fields) {
    if (field in input) {
      updateData[field] = input[field];
    }
  }

  Object.assign(existing, {
    ...updateData,
    ...(slug ? { slug } : {}),
    images: imagesWithAlts,
    video,
    category: input.category === null ? undefined : input.category ?? existing.category,
    brand: input.brand === null ? undefined : input.brand ?? existing.brand,
  });

  await existing.save();
  return Product.findById(existing._id).populate(productPopulate).lean();
}

async function deleteProduct(id) {
  const product = await Product.findById(id);
  if (!product) throw new NotFoundError("Product not found");

  const productImages = product.images;
  const publicIds = [];

  if (productImages?.primary?.publicId) {
    publicIds.push(productImages.primary.publicId);
  }
  if (productImages?.gallery?.length) {
    productImages.gallery.forEach((img) => {
      if (img.publicId) publicIds.push(img.publicId);
    });
  }

  if (publicIds.length > 0) {
    await deleteMultipleFromCloudinary(publicIds);
  }

  if (product.video?.publicId) {
    await deleteFromCloudinary(product.video.publicId, "video");
  }

  await Product.findByIdAndDelete(id);
  return { id };
}

async function listProductsByCategorySlug(categorySlug, query) {
  const category = await Category.findOne({ slug: categorySlug, status: "active" });
  if (!category) throw new NotFoundError("Category not found");

  return listPublicProducts({ ...query, category: category._id.toString() });
}

async function getRelatedProducts(slug, limit = 8) {
  const product = await Product.findOne({ slug, status: "active" }).select("category brand _id");
  if (!product) throw new NotFoundError("Product not found");

  const filter = {
    status: "active",
    _id: { $ne: product._id },
    $or: [
      ...(product.category ? [{ category: product.category }] : []),
      ...(product.brand ? [{ brand: product.brand }] : []),
    ],
  };

  if (!filter.$or?.length) delete filter.$or;

  const items = await Product.find(filter)
    .populate(productPopulate)
    .sort({ featured: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  return items;
}

module.exports = {
  listPublicProducts,
  listAdminProducts,
  getPublicProductBySlug,
  getAdminProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  listProductsByCategorySlug,
  getRelatedProducts,
};
