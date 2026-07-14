const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    group: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

settingsSchema.index({ group: 1 });

const Settings = mongoose.model("Settings", settingsSchema);

module.exports = { Settings };
