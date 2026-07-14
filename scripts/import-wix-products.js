const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const { connectDatabase, disconnectDatabase } = require("../src/config/db");
const { Brand } = require("../src/models/Brand");
const { Category } = require("../src/models/Category");
const { Product } = require("../src/models/Product");
const { ensureUniqueSlug, generateSlug } = require("../src/utils/slug");

dotenv.config();

async function upsertCategory(slug, name) {
  const existing = await Category.findOne({ slug });
  if (existing) return existing;
  return Category.create({
    name,
    slug: await ensureUniqueSlug(Category, slug),
    status: "active",
  });
}

async function upsertBrand(name) {
  const slug = generateSlug(name);
  const existing = await Brand.findOne({ slug });
  if (existing) return existing;
  return Brand.create({
    name,
    slug: await ensureUniqueSlug(Brand, name),
    status: "active",
  });
}

async function main() {
  const filePath = path.join(__dirname, "../data/wix-export.json");

  if (!fs.existsSync(filePath)) {
    console.error(`Missing export file: ${filePath}`);
    console.error(
      "Copy backend/data/wix-export.example.json to wix-export.json and edit.",
    );
    process.exit(1);
  }

  await connectDatabase();

  const raw = fs.readFileSync(filePath, "utf-8");
  const items = JSON.parse(raw);

  let created = 0;
  let skipped = 0;

  for (const item of items) {
    const slug = item.slug || generateSlug(item.name);
    const exists = await Product.findOne({ slug });
    if (exists) {
      skipped += 1;
      continue;
    }

    let categoryId;
    if (item.collectionSlug) {
      const cat = await upsertCategory(
        item.collectionSlug,
        item.collectionSlug.replace(/-/g, " ").toUpperCase(),
      );
      categoryId = cat._id;
    }

    let brandId;
    if (item.brandName) {
      const brand = await upsertBrand(item.brandName);
      brandId = brand._id;
    }

    await Product.create({
      title: item.name,
      slug: await ensureUniqueSlug(Product, slug),
      description: item.description,
      shortDescription: item.shortDescription,
      price: item.price,
      salePrice: item.salePrice,
      sku: item.sku,
      stock: item.stock ?? 0,
      category: categoryId,
      brand: brandId,
      images: item.imageUrl
        ? [{ url: item.imageUrl, isPrimary: true, alt: item.name }]
        : [],
      status: "active",
      featured: item.featured ?? false,
      newArrival: item.newArrival ?? false,
      bestSeller: item.bestSeller ?? false,
      ribbon: item.ribbon,
    });

    created += 1;
  }

  console.log(`Import complete. Created: ${created}, Skipped: ${skipped}`);
  await disconnectDatabase();
  process.exit(0);
}

main().catch(async (error) => {
  console.error("Import failed:", error);
  await disconnectDatabase();
  process.exit(1);
});
