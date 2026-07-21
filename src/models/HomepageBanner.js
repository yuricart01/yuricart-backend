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

const SECTIONS = ["hero", "promo", "mobiles", "laptops", "smart", "desktop"];

const homepageBannerSchema = new mongoose.Schema(
  {
    section: {
      type: String,
      enum: SECTIONS,
      required: true,
      index: true,
    },
    slot: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: imageDataSchema,
      default: () => ({ url: "" }),
      set: normalizeImage,
    },
    link: { type: String, trim: true, default: "" },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "homepage_banners" },
);

homepageBannerSchema.index({ section: 1, slot: 1 }, { unique: true });
homepageBannerSchema.index({ section: 1, active: 1, sortOrder: 1 });

const HomepageBanner = mongoose.model("HomepageBanner", homepageBannerSchema);

module.exports = { HomepageBanner, SECTIONS };
