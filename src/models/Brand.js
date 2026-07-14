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

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    image: { type: imageDataSchema, default: () => ({}), set: normalizeImage },
    logo: { type: String, trim: true },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true },
);

brandSchema.index({ name: "text" });
brandSchema.index({ status: 1, name: 1 });

const Brand = mongoose.model("Brand", brandSchema);

module.exports = { Brand };
