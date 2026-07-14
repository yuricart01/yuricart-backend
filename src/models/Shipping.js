const mongoose = require("mongoose");

const shippingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    rate: { type: Number, required: true, min: 0 },
    freeAbove: { type: Number, min: 0 },
    regions: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true },
);

shippingSchema.index({ status: 1, name: 1 });

const Shipping = mongoose.model("Shipping", shippingSchema);

module.exports = { Shipping };
