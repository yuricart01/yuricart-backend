const { z } = require("zod");

const settingsQuerySchema = z.object({
  group: z.string().optional(),
});

const upsertSettingsSchema = z.object({
  settings: z
    .array(
      z.object({
        key: z.string().min(1),
        value: z.unknown(),
        group: z.string().min(1),
      }),
    )
    .min(1),
});

module.exports = { settingsQuerySchema, upsertSettingsSchema };
