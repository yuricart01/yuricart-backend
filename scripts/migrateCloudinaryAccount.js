/**
 * Migrate Cloudinary assets from an old account to a new account,
 * then rewrite every image/video URL in MongoDB to point at the new cloud.
 *
 * Covers: products (primary, gallery, video), categories, brands (image + legacy logo),
 * banners, homepage_banners, and order item image snapshots.
 *
 * Setup — add these to server/.env (keep your existing MONGODB_URI):
 *
 *   CLOUDINARY_OLD_CLOUD_NAME=his_cloud_name
 *   CLOUDINARY_OLD_API_KEY=his_api_key
 *   CLOUDINARY_OLD_API_SECRET=his_api_secret
 *
 *   CLOUDINARY_NEW_CLOUD_NAME=your_cloud_name
 *   CLOUDINARY_NEW_API_KEY=your_api_key
 *   CLOUDINARY_NEW_API_SECRET=your_api_secret
 *
 * Usage:
 *   npm run migrate:cloudinary -- --dry-run          # report only, no uploads/writes
 *   npm run migrate:cloudinary                       # transfer + update DB
 *   npm run migrate:cloudinary -- --skip-orders      # leave historical order images alone
 *   npm run migrate:cloudinary -- --concurrency=3
 *
 * After a successful run:
 *   1. Point CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET in .env at your NEW account
 *   2. Remove CLOUDINARY_OLD_* and CLOUDINARY_NEW_* if you no longer need them
 *   3. Verify the site / admin uploads
 *   4. (Optional) Delete assets from the old Cloudinary account
 */

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;

dotenv.config();

const { Product } = require("../src/models/Product");
const { Category } = require("../src/models/Category");
const { Brand } = require("../src/models/Brand");
const { Banner } = require("../src/models/Banner");
const { HomepageBanner } = require("../src/models/HomepageBanner");
const { Order } = require("../src/models/Order");

// ---------------------------------------------------------------------------
// CLI / env
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    dryRun: false,
    skipOrders: false,
    concurrency: 4,
  };

  for (const raw of argv) {
    if (raw === "--dry-run") args.dryRun = true;
    else if (raw === "--skip-orders") args.skipOrders = true;
    else if (raw.startsWith("--concurrency=")) {
      const n = Number(raw.split("=")[1]);
      if (Number.isFinite(n) && n >= 1 && n <= 20) args.concurrency = Math.floor(n);
    }
  }

  return args;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return String(value).trim();
}

function loadConfig() {
  return {
    mongoUri: requireEnv("MONGODB_URI"),
    old: {
      cloud_name: requireEnv("CLOUDINARY_OLD_CLOUD_NAME"),
      api_key: requireEnv("CLOUDINARY_OLD_API_KEY"),
      api_secret: requireEnv("CLOUDINARY_OLD_API_SECRET"),
    },
    neu: {
      cloud_name: requireEnv("CLOUDINARY_NEW_CLOUD_NAME"),
      api_key: requireEnv("CLOUDINARY_NEW_API_KEY"),
      api_secret: requireEnv("CLOUDINARY_NEW_API_SECRET"),
    },
  };
}

// ---------------------------------------------------------------------------
// Cloudinary helpers
// ---------------------------------------------------------------------------

function configureCloudinary(creds) {
  cloudinary.config({
    cloud_name: creds.cloud_name,
    api_key: creds.api_key,
    api_secret: creds.api_secret,
    secure: true,
  });
}

function isCloudinaryHost(hostname) {
  return (
    hostname === "res.cloudinary.com" ||
    hostname.endsWith(".cloudinary.com") ||
    hostname === "cdn.zuricart.co.ke"
  );
}

function urlBelongsToCloud(url, cloudName) {
  if (!url || typeof url !== "string") return false;
  try {
    const u = new URL(url);
    if (!isCloudinaryHost(u.hostname)) return false;
    // res.cloudinary.com/<cloud_name>/...
    if (u.hostname === "res.cloudinary.com" || u.hostname.endsWith(".cloudinary.com")) {
      const first = u.pathname.split("/").filter(Boolean)[0];
      return first === cloudName;
    }
    // Custom CNAME (cdn.zuricart.co.ke) — treat as old-account media if path looks Cloudinary
    return u.pathname.includes("/image/upload/") || u.pathname.includes("/video/upload/");
  } catch {
    return false;
  }
}

/**
 * Extract public_id from a Cloudinary delivery URL.
 * Handles transformation segments and version prefixes.
 */
function extractPublicIdFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  try {
    const u = new URL(url);
    const pathname = u.pathname; // /<cloud>/image/upload/... or /image/upload/... on CNAME
    const marker = "/upload/";
    const idx = pathname.indexOf(marker);
    if (idx === -1) return null;

    let rest = pathname.slice(idx + marker.length);
    // Drop leading transformation / version segments
    const segments = rest.split("/").filter(Boolean);
    let start = 0;
    while (start < segments.length) {
      const seg = segments[start];
      if (/^v\d+$/.test(seg)) {
        start += 1;
        break;
      }
      // Transformation segment (e.g. c_fill,w_800 or so_0)
      if (seg.includes(",") || (seg.includes("_") && !seg.includes(" "))) {
        // Heuristic: folder public_ids rarely use commas; transformation params do
        if (seg.includes(",") || /^(c_|w_|h_|q_|f_|g_|so_|e_|b_|ar_|dpr_)/.test(seg)) {
          start += 1;
          continue;
        }
      }
      break;
    }

    if (start >= segments.length) return null;
    let publicId = segments.slice(start).join("/");
    // Strip file extension from last segment
    publicId = publicId.replace(/\.[a-zA-Z0-9]+$/, "");
    return publicId || null;
  } catch {
    return null;
  }
}

function detectResourceType(url, hint) {
  if (hint === "video" || hint === "image" || hint === "raw") return hint;
  if (!url) return "image";
  if (url.includes("/video/upload/")) return "video";
  return "image";
}

function buildVideoThumbnailUrl(publicId) {
  return cloudinary.url(publicId, {
    resource_type: "video",
    format: "jpg",
    transformation: [{ start_offset: "0" }],
    secure: true,
  });
}

function rewriteUrlCloudName(url, oldCloud, newCloud) {
  if (!url || typeof url !== "string") return url;
  if (!url.includes(oldCloud)) return url;
  return url.split(oldCloud).join(newCloud);
}

/**
 * Download asset bytes from the OLD account.
 * Never uses Cloudinary "upload from remote URL" — that gets 403 when the
 * source is another Cloudinary CDN (fetch between clouds is blocked).
 */
async function downloadFromOldAccount({
  sourceUrl,
  publicId,
  resourceType,
  oldCreds,
}) {
  const type = detectResourceType(sourceUrl, resourceType);
  configureCloudinary(oldCreds);

  let format;
  let adminSecureUrl;

  if (publicId) {
    try {
      const resource = await cloudinary.api.resource(publicId, {
        resource_type: type,
      });
      adminSecureUrl = resource.secure_url || resource.url;
      format = resource.format;
    } catch (err) {
      // Resource lookup failed — still try delivery URLs below
    }
  }

  /** @type {string[]} */
  const candidates = [];
  if (adminSecureUrl) candidates.push(adminSecureUrl);
  if (sourceUrl) candidates.push(sourceUrl);

  if (publicId) {
    // Signed delivery (helps when unsigned access is restricted)
    candidates.push(
      cloudinary.url(publicId, {
        resource_type: type,
        secure: true,
        sign_url: true,
        ...(format ? { format } : {}),
      }),
    );
    candidates.push(
      cloudinary.url(publicId, {
        resource_type: type,
        secure: true,
        ...(format ? { format } : {}),
      }),
    );

    // Authenticated Admin API download endpoint
    const fmt = format || (type === "video" ? "mp4" : "jpg");
    try {
      candidates.push(
        cloudinary.utils.private_download_url(publicId, fmt, {
          resource_type: type,
          attachment: false,
        }),
      );
    } catch {
      /* ignore */
    }
  }

  const tried = [];
  for (const url of candidates) {
    if (!url || tried.includes(url)) continue;
    tried.push(url);
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "YuriCart-Cloudinary-Migration/1.0" },
        redirect: "follow",
      });
      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length === 0) continue;
        return { buffer, format, resourceType: type };
      }
      tried[tried.length - 1] = `${url} → HTTP ${response.status}`;
    } catch (err) {
      tried[tried.length - 1] = `${url} → ${err.message}`;
    }
  }

  throw new Error(
    `Download failed for ${publicId || sourceUrl}. Tried: ${tried.join(" | ")}`,
  );
}

/**
 * Upload an asset into the NEW account, preserving public_id when possible.
 * Downloads via old account, then buffer-uploads to new (avoids Cloudinary fetch 403).
 */
async function transferAsset({
  sourceUrl,
  publicId,
  resourceType,
  dryRun,
  oldCreds,
  newCreds,
}) {
  const type = detectResourceType(sourceUrl, resourceType);
  const id = publicId || extractPublicIdFromUrl(sourceUrl);

  if (!sourceUrl && !id) {
    throw new Error("No sourceUrl or publicId to transfer");
  }

  if (dryRun) {
    return {
      url: sourceUrl || null,
      publicId: id,
      resourceType: type,
      dryRun: true,
    };
  }

  const { buffer } = await downloadFromOldAccount({
    sourceUrl,
    publicId: id,
    resourceType: type,
    oldCreds,
  });

  configureCloudinary(newCreds);

  const uploadOptions = {
    resource_type: type,
    overwrite: true,
    invalidate: true,
  };
  if (id) {
    uploadOptions.public_id = id;
  }

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(uploadOptions, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
    stream.end(buffer);
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    resourceType: type,
    dryRun: false,
  };
}

// ---------------------------------------------------------------------------
// Concurrency
// ---------------------------------------------------------------------------

async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const i = next;
      next += 1;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () =>
    worker(),
  );
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------------
// Collect + migrate image refs from DB docs
// ---------------------------------------------------------------------------

/**
 * @typedef {{ url?: string, publicId?: string, resourceType?: string, regenerateThumbnail?: boolean }} ImageRef
 */

function pushRef(list, ref, meta) {
  if (!ref) return;
  const url = typeof ref === "string" ? ref : ref.url;
  const publicId = typeof ref === "string" ? undefined : ref.publicId;
  if (!url && !publicId) return;
  list.push({
    url: url || "",
    publicId: publicId || undefined,
    resourceType: ref.resourceType || "image",
    regenerateThumbnail: Boolean(ref.regenerateThumbnail),
    ...meta,
  });
}

function collectProductRefs(doc) {
  /** @type {Array<Record<string, unknown>>} */
  const refs = [];
  const images = doc.images;

  if (!images) return refs;

  // Legacy array shape
  if (Array.isArray(images)) {
    images.forEach((img, index) => {
      pushRef(refs, img, { field: `images[${index}]` });
    });
    return refs;
  }

  pushRef(refs, images.primary, { field: "images.primary" });
  if (Array.isArray(images.gallery)) {
    images.gallery.forEach((img, index) => {
      pushRef(refs, img, { field: `images.gallery[${index}]` });
    });
  }

  if (doc.video && (doc.video.url || doc.video.publicId)) {
    pushRef(
      refs,
      {
        url: doc.video.url,
        publicId: doc.video.publicId,
        resourceType: "video",
        regenerateThumbnail: true,
      },
      { field: "video" },
    );
  }

  return refs;
}

function needsMigration(ref, oldCloud) {
  if (ref.publicId) {
    // publicId alone is enough — migrate if URL is empty, old cloud, or custom CDN
    if (!ref.url) return true;
    return urlBelongsToCloud(ref.url, oldCloud) || ref.url.includes(oldCloud);
  }
  if (!ref.url) return false;
  return urlBelongsToCloud(ref.url, oldCloud) || ref.url.includes(oldCloud);
}

function applyTransferred(doc, field, transferred, oldCloud, newCloud) {
  const nextUrl =
    transferred.url ||
    rewriteUrlCloudName(
      field === "video" ? doc.video?.url : undefined,
      oldCloud,
      newCloud,
    );

  if (field === "images.primary") {
    doc.images = doc.images || {};
    doc.images.primary = {
      url: transferred.url,
      publicId: transferred.publicId,
    };
    return;
  }

  const galleryMatch = /^images\.gallery\[(\d+)\]$/.exec(field);
  if (galleryMatch) {
    const idx = Number(galleryMatch[1]);
    doc.images = doc.images || {};
    doc.images.gallery = doc.images.gallery || [];
    doc.images.gallery[idx] = {
      url: transferred.url,
      publicId: transferred.publicId,
    };
    return;
  }

  const legacyMatch = /^images\[(\d+)\]$/.exec(field);
  if (legacyMatch) {
    const idx = Number(legacyMatch[1]);
    if (Array.isArray(doc.images)) {
      doc.images[idx] = {
        ...(doc.images[idx] || {}),
        url: transferred.url,
        publicId: transferred.publicId,
      };
    }
    return;
  }

  if (field === "video") {
    doc.video = {
      ...(doc.video || {}),
      url: transferred.url,
      publicId: transferred.publicId,
      thumbnailUrl: transferred.thumbnailUrl || buildVideoThumbnailUrl(transferred.publicId),
    };
    return;
  }

  if (field === "image") {
    doc.image = {
      url: transferred.url,
      publicId: transferred.publicId,
    };
    return;
  }

  if (field === "logo") {
    doc.logo = transferred.url;
    return;
  }

  // Fallback unused
  void nextUrl;
}

// ---------------------------------------------------------------------------
// Collection runners
// ---------------------------------------------------------------------------

async function migrateImageObjectCollection({
  Model,
  label,
  oldCloud,
  newCloud,
  dryRun,
  concurrency,
  cache,
  stats,
  getExtraStringFields,
}) {
  const docs = await Model.find({}).exec();
  console.log(`\n[${label}] ${docs.length} document(s)`);

  for (const doc of docs) {
    const refs = [];
    pushRef(refs, doc.image, { field: "image" });

    if (typeof getExtraStringFields === "function") {
      for (const { field, value } of getExtraStringFields(doc)) {
        if (value) pushRef(refs, value, { field });
      }
    }

    let changed = false;

    for (const ref of refs) {
      if (!needsMigration(ref, oldCloud.cloud_name)) continue;

      const cacheKey = `${ref.resourceType || "image"}:${ref.publicId || ref.url}`;
      let transferred = cache.get(cacheKey);

      if (!transferred) {
        try {
          let sourceUrl = ref.url;
          if (!sourceUrl && ref.publicId) {
            configureCloudinary(oldCloud);
            sourceUrl = cloudinary.url(ref.publicId, {
              resource_type: ref.resourceType || "image",
              secure: true,
            });
          }

          transferred = await transferAsset({
            sourceUrl,
            publicId: ref.publicId || extractPublicIdFromUrl(sourceUrl),
            resourceType: ref.resourceType || "image",
            dryRun,
            oldCreds: oldCloud,
            newCreds: newCloud,
          });

          if (dryRun && transferred.url) {
            transferred = {
              ...transferred,
              url: rewriteUrlCloudName(transferred.url, oldCloud.cloud_name, newCloud.cloud_name),
              publicId: transferred.publicId,
            };
          }

          cache.set(cacheKey, transferred);
          stats.transferred += 1;
          console.log(
            `  ✓ ${label} ${doc._id} ${ref.field}: ${ref.publicId || ref.url} → ${transferred.publicId}`,
          );
        } catch (err) {
          stats.failed += 1;
          console.error(
            `  ✗ ${label} ${doc._id} ${ref.field}: ${err.message}`,
          );
          stats.errors.push({
            collection: label,
            id: String(doc._id),
            field: ref.field,
            error: err.message,
          });
          continue;
        }
      } else {
        stats.cacheHits += 1;
      }

      applyTransferred(doc, ref.field, transferred, oldCloud.cloud_name, newCloud.cloud_name);
      changed = true;
      stats.updatedRefs += 1;
    }

    if (changed && !dryRun) {
      doc.markModified("image");
      if (doc.logo !== undefined) doc.markModified("logo");
      await doc.save();
      stats.updatedDocs += 1;
    } else if (changed && dryRun) {
      stats.updatedDocs += 1;
    }
  }
}

async function migrateProducts({ oldCloud, newCloud, dryRun, concurrency, cache, stats }) {
  const docs = await Product.find({}).exec();
  console.log(`\n[products] ${docs.length} document(s)`);

  await mapPool(docs, concurrency, async (doc) => {
    const refs = collectProductRefs(doc);
    let changed = false;

    for (const ref of refs) {
      if (!needsMigration(ref, oldCloud.cloud_name)) continue;

      const cacheKey = `${ref.resourceType || "image"}:${ref.publicId || ref.url}`;
      let transferred = cache.get(cacheKey);

      if (!transferred) {
        try {
          let sourceUrl = ref.url;
          if (!sourceUrl && ref.publicId) {
            configureCloudinary(oldCloud);
            sourceUrl = cloudinary.url(ref.publicId, {
              resource_type: ref.resourceType || "image",
              secure: true,
            });
          }

          // Skip derived video poster URLs as separate uploads when video field handles it
          if (
            ref.field !== "video" &&
            sourceUrl &&
            sourceUrl.includes("/video/upload/") &&
            sourceUrl.includes("so_")
          ) {
            continue;
          }

          transferred = await transferAsset({
            sourceUrl,
            publicId: ref.publicId || extractPublicIdFromUrl(sourceUrl),
            resourceType: ref.resourceType || "image",
            dryRun,
            oldCreds: oldCloud,
            newCreds: newCloud,
          });

          if (ref.regenerateThumbnail && transferred.publicId) {
            configureCloudinary(newCloud);
            transferred.thumbnailUrl = dryRun
              ? rewriteUrlCloudName(
                  doc.video?.thumbnailUrl || "",
                  oldCloud.cloud_name,
                  newCloud.cloud_name,
                ) || buildVideoThumbnailUrl(transferred.publicId)
              : buildVideoThumbnailUrl(transferred.publicId);
          }

          if (dryRun && transferred.url) {
            transferred = {
              ...transferred,
              url: rewriteUrlCloudName(
                transferred.url,
                oldCloud.cloud_name,
                newCloud.cloud_name,
              ),
            };
          }

          cache.set(cacheKey, transferred);
          stats.transferred += 1;
          console.log(
            `  ✓ product ${doc._id} ${ref.field}: ${ref.publicId || truncate(ref.url)} → ${transferred.publicId}`,
          );
        } catch (err) {
          stats.failed += 1;
          console.error(`  ✗ product ${doc._id} ${ref.field}: ${err.message}`);
          stats.errors.push({
            collection: "products",
            id: String(doc._id),
            field: ref.field,
            error: err.message,
          });
          continue;
        }
      } else {
        stats.cacheHits += 1;
      }

      applyTransferred(doc, ref.field, transferred, oldCloud.cloud_name, newCloud.cloud_name);
      changed = true;
      stats.updatedRefs += 1;
    }

    if (changed && !dryRun) {
      doc.markModified("images");
      doc.markModified("video");
      await doc.save();
      stats.updatedDocs += 1;
    } else if (changed && dryRun) {
      stats.updatedDocs += 1;
    }
  });
}

async function migrateOrders({ oldCloud, newCloud, dryRun, stats }) {
  const docs = await Order.find({
    "items.image": { $regex: oldCloud.cloud_name },
  }).exec();

  // Also catch custom CDN snapshots
  const cdnDocs = await Order.find({
    "items.image": { $regex: "cdn\\.zuricart\\.co\\.ke" },
  }).exec();

  const byId = new Map();
  for (const d of [...docs, ...cdnDocs]) byId.set(String(d._id), d);
  const all = [...byId.values()];

  console.log(`\n[orders] ${all.length} order(s) with old image URLs`);

  for (const doc of all) {
    let changed = false;
    for (const item of doc.items || []) {
      if (!item.image) continue;
      if (
        !item.image.includes(oldCloud.cloud_name) &&
        !item.image.includes("cdn.zuricart.co.ke")
      ) {
        continue;
      }
      item.image = rewriteUrlCloudName(
        item.image,
        oldCloud.cloud_name,
        newCloud.cloud_name,
      );
      // Custom CDN → standard Cloudinary host on new account
      if (item.image.includes("cdn.zuricart.co.ke")) {
        const publicId = extractPublicIdFromUrl(item.image);
        if (publicId) {
          configureCloudinary({
            cloud_name: newCloud.cloud_name,
            api_key: newCloud.api_key,
            api_secret: newCloud.api_secret,
          });
          item.image = cloudinary.url(publicId, { secure: true });
        }
      }
      changed = true;
      stats.updatedRefs += 1;
    }
    if (changed && !dryRun) {
      doc.markModified("items");
      await doc.save();
      stats.updatedDocs += 1;
    } else if (changed && dryRun) {
      stats.updatedDocs += 1;
    }
  }
}

function truncate(s, n = 80) {
  if (!s) return "";
  return s.length <= n ? s : `${s.slice(0, n)}…`;
}

// ---------------------------------------------------------------------------
// Optional: list old-account assets (informational)
// ---------------------------------------------------------------------------

async function countOldFolderAssets(oldCreds) {
  configureCloudinary(oldCreds);
  const folders = [
    "yuricart/products",
    "yuricart/products/gallery",
    "yuricart/products/videos",
    "yuricart/categories",
    "yuricart/brands",
    "yuricart/banners",
    "yuricart/homepage",
  ];

  let total = 0;
  for (const prefix of folders) {
    try {
      let nextCursor;
      do {
        const res = await cloudinary.api.resources({
          type: "upload",
          prefix,
          max_results: 500,
          next_cursor: nextCursor,
        });
        total += res.resources?.length || 0;
        nextCursor = res.next_cursor;
      } while (nextCursor);
    } catch (err) {
      console.warn(`  (warn) could not list ${prefix}: ${err.message}`);
    }
  }
  return total;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = loadConfig();

  if (config.old.cloud_name === config.neu.cloud_name) {
    throw new Error(
      "CLOUDINARY_OLD_CLOUD_NAME and CLOUDINARY_NEW_CLOUD_NAME are the same — aborting.",
    );
  }

  console.log("Cloudinary account migration");
  console.log("============================");
  console.log(`Old cloud : ${config.old.cloud_name}`);
  console.log(`New cloud : ${config.neu.cloud_name}`);
  console.log(`Dry run   : ${args.dryRun}`);
  console.log(`Skip orders: ${args.skipOrders}`);
  console.log(`Concurrency: ${args.concurrency}`);

  await mongoose.connect(config.mongoUri);
  console.log(`MongoDB   : ${mongoose.connection.name}`);

  try {
    console.log("\nScanning old Cloudinary folders (informational)…");
    const oldCount = await countOldFolderAssets(config.old);
    console.log(`Old account assets under yuricart/* (images list): ~${oldCount}`);
  } catch (err) {
    console.warn(`Could not scan old account: ${err.message}`);
  }

  const cache = new Map();
  const stats = {
    transferred: 0,
    cacheHits: 0,
    updatedRefs: 0,
    updatedDocs: 0,
    failed: 0,
    errors: [],
  };

  const shared = {
    oldCloud: config.old,
    newCloud: config.neu,
    dryRun: args.dryRun,
    concurrency: args.concurrency,
    cache,
    stats,
  };

  await migrateProducts(shared);

  await migrateImageObjectCollection({
    ...shared,
    Model: Category,
    label: "categories",
  });

  await migrateImageObjectCollection({
    ...shared,
    Model: Brand,
    label: "brands",
    getExtraStringFields: (doc) =>
      doc.logo ? [{ field: "logo", value: doc.logo }] : [],
  });

  await migrateImageObjectCollection({
    ...shared,
    Model: Banner,
    label: "banners",
  });

  await migrateImageObjectCollection({
    ...shared,
    Model: HomepageBanner,
    label: "homepage_banners",
  });

  if (!args.skipOrders) {
    await migrateOrders({
      oldCloud: config.old,
      newCloud: config.neu,
      dryRun: args.dryRun,
      stats,
    });
  } else {
    console.log("\n[orders] skipped (--skip-orders)");
  }

  const report = {
    ranAt: new Date().toISOString(),
    dryRun: args.dryRun,
    oldCloud: config.old.cloud_name,
    newCloud: config.neu.cloud_name,
    stats,
  };

  const reportPath = path.join(
    __dirname,
    `cloudinary-migration-report-${Date.now()}.json`,
  );
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log("\n============================");
  console.log("Done.");
  console.log(`  Assets transferred : ${stats.transferred}`);
  console.log(`  Cache hits         : ${stats.cacheHits}`);
  console.log(`  Refs updated       : ${stats.updatedRefs}`);
  console.log(`  Docs updated       : ${stats.updatedDocs}`);
  console.log(`  Failures           : ${stats.failed}`);
  console.log(`  Report             : ${reportPath}`);

  if (args.dryRun) {
    console.log("\nThis was a dry run — nothing was uploaded or written to MongoDB.");
    console.log("Re-run without --dry-run to perform the migration.");
  } else if (stats.failed === 0) {
    console.log("\nNext steps:");
    console.log("  1. Set CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET to your NEW account");
    console.log("  2. Restart the API and verify product/banner images load");
    console.log("  3. Upload a test image in admin to confirm new credentials work");
    console.log("  4. Remove CLOUDINARY_OLD_* from .env, then delete the old Cloudinary account assets");
  } else {
    console.log("\nSome assets failed — see the report JSON and re-run (safe: overwrite=true).");
    process.exitCode = 1;
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("\nMigration aborted:", err.message);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
