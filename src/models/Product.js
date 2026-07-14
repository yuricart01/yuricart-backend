const mongoose = require("mongoose");

const productImageDataSchema = new mongoose.Schema(
  {
    url: { type: String, default: "" },
    publicId: { type: String, trim: true },
  },
  { _id: false },
);

const productImagesSchema = new mongoose.Schema(
  {
    primary: { type: productImageDataSchema, default: () => ({ url: "" }) },
    gallery: { type: [productImageDataSchema], default: [] },
  },
  { _id: false },
);

const productVariantSchema = new mongoose.Schema(
  {
    sku: { type: String, trim: true },
    options: { type: Map, of: String },
    price: { type: Number, min: 0 },
    salePrice: { type: Number, min: 0 },
    stock: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
);

function normalizeImages(value) {
  if (!value) {
    return { primary: { url: "" }, gallery: [] };
  }
  if (Array.isArray(value)) {
    const arr = value;
    const primary = arr.find((img) => img.isPrimary) || arr[0];
    const gallery = arr.filter((img) => img !== primary && img !== arr[0]);
    return {
      primary: { url: primary?.url || "", publicId: primary?.publicId },
      gallery: gallery.map((img) => ({ url: img.url, publicId: img.publicId })),
    };
  }
  const obj = value;
  return {
    primary: obj.primary || { url: "" },
    gallery: obj.gallery || [],
  };
}

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String },
    shortDescription: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, min: 0 },
    sku: { type: String, trim: true, sparse: true, unique: true },
    stock: { type: Number, default: 0, min: 0 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: "Brand" },
    images: {
      type: productImagesSchema,
      default: () => ({ primary: { url: "" }, gallery: [] }),
      set: normalizeImages,
    },
    tags: { type: [String], default: [] },
    colors: { type: [String], default: [] },
    sizes: { type: [String], default: [] },
    variants: { type: [productVariantSchema], default: [] },
    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "draft",
    },
    featured: { type: Boolean, default: false },
    newArrival: { type: Boolean, default: false },
    bestSeller: { type: Boolean, default: false },
    ribbon: { type: String, trim: true },
    currency: { type: String, default: "KES", uppercase: true },
  },
  { timestamps: true },
);

productSchema.index({ title: "text", description: "text", tags: "text" });
productSchema.index({ status: 1, featured: 1, newArrival: 1, bestSeller: 1 });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ brand: 1, status: 1 });
productSchema.index({ price: 1 });

const Product = mongoose.model("Product", productSchema);

module.exports = { Product };
