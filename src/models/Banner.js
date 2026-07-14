const mongoose = require("mongoose");

function normalizeImage(value) {
  if (!value) return {};
  if (typeof value === "string") return { url: value };
  if (typeof value === "object" && value !== null) {
    const obj = value;
    if (obj.publicId || obj.url) return obj;
    return {};
  }
  return {};
}

const imageDataSchema = new mongoose.Schema(
  { url: { type: String, default: "" }, publicId: { type: String, trim: true } },
  { _id: false },
);

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    image: { type: imageDataSchema, default: () => ({ url: "" }), set: normalizeImage },
    link: { type: String, trim: true },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    sortOrder: { type: Number, default: 0 },
    placement: {
      type: String,
      enum: ["hero", "promo"],
      default: "hero",
    },
  },
  { timestamps: true },
);

bannerSchema.index({ status: 1, placement: 1, sortOrder: 1 });

const Banner = mongoose.model("Banner", bannerSchema);

module.exports = { Banner };
