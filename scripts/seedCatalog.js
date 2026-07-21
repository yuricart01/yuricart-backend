/**
 * Seed categories, brands, and products for local/dev use.
 * Idempotent: upserts by slug (safe to re-run).
 *
 * Usage: npm run seed:catalog
 */
const dotenv = require("dotenv");
const { connectDatabase, disconnectDatabase } = require("../src/config/db");
const { Category } = require("../src/models/Category");
const { Brand } = require("../src/models/Brand");
const { Product } = require("../src/models/Product");

dotenv.config();

const img = (seed, w = 800) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${w}`;

const CATEGORIES = [
  {
    name: "Accessories",
    slug: "accessories",
    description: "Chargers, cases, cables, and more",
    sortOrder: 1,
    image: { url: img("cat-accessories") },
  },
  {
    name: "Desktops",
    slug: "desktops",
    description: "Desktop PCs and workstations",
    sortOrder: 2,
    image: { url: img("cat-desktops") },
  },
  {
    name: "Laptops",
    slug: "laptops",
    description: "Laptops for work, school, and gaming",
    sortOrder: 3,
    image: { url: img("cat-laptops") },
  },
  {
    name: "Phones",
    slug: "phones",
    description: "Smartphones and mobile devices",
    sortOrder: 4,
    image: { url: img("cat-phones") },
  },
  {
    name: "Printers",
    slug: "printers",
    description: "Printers and printing supplies",
    sortOrder: 5,
    image: { url: img("cat-printers") },
  },
  {
    name: "Tablets",
    slug: "tablets",
    description: "Tablets and e-readers",
    sortOrder: 6,
    image: { url: img("cat-tablets") },
  },
];

const BRANDS = [
  { name: "Apple", slug: "apple" },
  { name: "Samsung", slug: "samsung" },
  { name: "Xiaomi", slug: "xiaomi" },
  { name: "Dell", slug: "dell" },
  { name: "HP", slug: "hp" },
  { name: "Lenovo", slug: "lenovo" },
  { name: "Canon", slug: "canon" },
  { name: "Epson", slug: "epson" },
];

/** @type {Array<Record<string, unknown>>} */
const PRODUCTS = [
  // Phones
  {
    title: "Redmi Note 14 Pro - 8GB | 256GB",
    slug: "redmi-note-14-pro-8-256",
    categorySlug: "phones",
    brandSlug: "xiaomi",
    price: 42000,
    salePrice: 38500,
    stock: 25,
    featured: true,
    newArrival: true,
    ribbon: "SALE",
    shortDescription: "108MP camera · AMOLED · 5000mAh",
    description:
      "<p>Xiaomi Redmi Note 14 Pro with 8GB RAM, 256GB storage, and a bright AMOLED display.</p>",
    tags: ["phones", "xiaomi", "5g"],
    images: { primary: { url: img("1598327105666-5b89351aff93") } },
  },
  {
    title: "Samsung Galaxy A55 5G - 8GB | 128GB",
    slug: "samsung-galaxy-a55-8-128",
    categorySlug: "phones",
    brandSlug: "samsung",
    price: 48000,
    salePrice: 44900,
    stock: 18,
    featured: true,
    bestSeller: true,
    ribbon: "SALE",
    shortDescription: "Super AMOLED · IP67 · 5000mAh",
    description: "<p>Samsung Galaxy A55 5G with premium build and long battery life.</p>",
    tags: ["phones", "samsung", "5g"],
    images: { primary: { url: img("1610945415295-d9bbf067e59c") } },
  },
  {
    title: "iPhone 13 - 128GB",
    slug: "iphone-13-128gb",
    categorySlug: "phones",
    brandSlug: "apple",
    price: 72000,
    salePrice: 68900,
    stock: 12,
    featured: true,
    shortDescription: "A15 Bionic · Dual camera · 5G",
    description: "<p>Apple iPhone 13 128GB. Reliable performance and great cameras.</p>",
    tags: ["phones", "apple", "iphone"],
    images: { primary: { url: img("1510557880182-3d4d3cba35a5") } },
  },
  {
    title: "Redmi A5 4G - 4GB | 64GB",
    slug: "redmi-a5-4g-4-64",
    categorySlug: "phones",
    brandSlug: "xiaomi",
    price: 14500,
    salePrice: 12900,
    stock: 40,
    featured: true,
    newArrival: true,
    ribbon: "SALE",
    shortDescription: "Budget 4G phone · Large display",
    description: "<p>Affordable Redmi A5 4G for everyday calls, WhatsApp, and browsing.</p>",
    tags: ["phones", "xiaomi", "budget"],
    images: { primary: { url: img("1601784551446-20c9e07cdbdb") } },
  },
  {
    title: "Samsung Galaxy Z Fold5 - 512GB",
    slug: "samsung-galaxy-z-fold5-512",
    categorySlug: "phones",
    brandSlug: "samsung",
    price: 185000,
    salePrice: 175000,
    stock: 5,
    featured: true,
    ribbon: "SALE",
    shortDescription: "Foldable · S Pen support · Galaxy AI",
    description: "<p>Samsung Galaxy Z Fold5 flagship foldable with expansive inner display.</p>",
    tags: ["phones", "samsung", "foldable"],
    images: { primary: { url: img("1678916210694-5b3e3d0a8e4a") } },
  },

  // Laptops
  {
    title: "Dell Latitude 7400 - 8th Gen Core i5 | 8GB | 256GB SSD",
    slug: "dell-latitude-7400-i5-8-256",
    categorySlug: "laptops",
    brandSlug: "dell",
    price: 35000,
    salePrice: 32000,
    stock: 15,
    featured: true,
    bestSeller: true,
    ribbon: "SALE",
    shortDescription: "Business ultrabook · Lightweight",
    description: "<p>Refurbished Dell Latitude 7400. Ideal for office and student use.</p>",
    tags: ["laptops", "dell", "business"],
    images: { primary: { url: img("1496181133206-80ce9b88a853") } },
  },
  {
    title: "HP EliteBook 840 G5 - Core i7 | 16GB | 512GB SSD",
    slug: "hp-elitebook-840-g5-i7-16-512",
    categorySlug: "laptops",
    brandSlug: "hp",
    price: 48000,
    salePrice: 45000,
    stock: 10,
    featured: true,
    shortDescription: "Premium business laptop · Fast SSD",
    description: "<p>HP EliteBook 840 G5 with Core i7, 16GB RAM and 512GB SSD.</p>",
    tags: ["laptops", "hp", "business"],
    images: { primary: { url: img("1525547719571-a2d4ac8945e2") } },
  },
  {
    title: "Lenovo ThinkPad X370 - Core i5 | 8GB | 256GB SSD",
    slug: "lenovo-thinkpad-x370-i5-8-256",
    categorySlug: "laptops",
    brandSlug: "lenovo",
    price: 38000,
    salePrice: 35500,
    stock: 14,
    featured: true,
    newArrival: true,
    ribbon: "SALE",
    shortDescription: "Convertible · ThinkPad durability",
    description: "<p>Lenovo ThinkPad X370 2-in-1 for professionals on the go.</p>",
    tags: ["laptops", "lenovo", "thinkpad"],
    images: { primary: { url: img("1588872657578-7b21cf64d3cb") } },
  },
  {
    title: "Dell Inspiron 15 - Ryzen 5 | 8GB | 512GB SSD",
    slug: "dell-inspiron-15-ryzen5-8-512",
    categorySlug: "laptops",
    brandSlug: "dell",
    price: 62000,
    salePrice: 58900,
    stock: 8,
    featured: true,
    shortDescription: "Everyday laptop · Full HD display",
    description: "<p>Dell Inspiron 15 with AMD Ryzen 5 for school and home use.</p>",
    tags: ["laptops", "dell"],
    images: { primary: { url: img("1484788984921-03950022c9ef") } },
  },

  // Desktops
  {
    title: "HP Compaq 8200 Elite Desktop - Core i5 | 8GB | 500GB",
    slug: "hp-compaq-8200-elite-i5-8-500",
    categorySlug: "desktops",
    brandSlug: "hp",
    price: 12000,
    salePrice: 9500,
    stock: 20,
    featured: true,
    bestSeller: true,
    ribbon: "SALE",
    shortDescription: "Reliable office tower · Quiet",
    description: "<p>HP Compaq 8200 Elite Desktop. Great for POS, office, and browsing.</p>",
    tags: ["desktops", "hp"],
    images: { primary: { url: img("1593640408182-31c70c8268f5") } },
  },
  {
    title: "HP EliteDesk 800 G3 SFF - Core i7 | 16GB | 256GB SSD",
    slug: "hp-elitedesk-800-g3-i7-16-256",
    categorySlug: "desktops",
    brandSlug: "hp",
    price: 28000,
    salePrice: 25500,
    stock: 11,
    featured: true,
    ribbon: "SALE",
    shortDescription: "Small form factor · Powerful",
    description: "<p>HP EliteDesk 800 G3 SFF with Core i7 and 16GB RAM.</p>",
    tags: ["desktops", "hp"],
    images: { primary: { url: img("1587831990711-4dd0a6c4a5a8") } },
  },
  {
    title: "Dell OptiPlex 7050 - Core i5 | 8GB | 256GB SSD",
    slug: "dell-optiplex-7050-i5-8-256",
    categorySlug: "desktops",
    brandSlug: "dell",
    price: 22000,
    salePrice: 19900,
    stock: 16,
    featured: true,
    shortDescription: "Business desktop · SSD boot",
    description: "<p>Dell OptiPlex 7050 for reliable everyday computing.</p>",
    tags: ["desktops", "dell"],
    images: { primary: { url: img("1555617981-dac3880eac6e") } },
  },

  // Tablets
  {
    title: "Samsung Galaxy Tab A9+ - 8GB | 128GB",
    slug: "samsung-galaxy-tab-a9-plus-8-128",
    categorySlug: "tablets",
    brandSlug: "samsung",
    price: 32000,
    salePrice: 29900,
    stock: 9,
    featured: true,
    newArrival: true,
    ribbon: "SALE",
    shortDescription: "11\" display · Quad speakers",
    description: "<p>Samsung Galaxy Tab A9+ for streaming, study, and light work.</p>",
    tags: ["tablets", "samsung"],
    images: { primary: { url: img("1544244015-0df4b3ffc6b0") } },
  },
  {
    title: "iPad 10th Gen - 64GB Wi-Fi",
    slug: "ipad-10th-gen-64gb",
    categorySlug: "tablets",
    brandSlug: "apple",
    price: 55000,
    salePrice: 52900,
    stock: 7,
    featured: true,
    shortDescription: "Liquid Retina · A14 Bionic",
    description: "<p>Apple iPad 10th generation with colorful design and USB-C.</p>",
    tags: ["tablets", "apple", "ipad"],
    images: { primary: { url: img("1542751110-97427bbecf20") } },
  },

  // Printers
  {
    title: "HP LaserJet Pro M404dn",
    slug: "hp-laserjet-pro-m404dn",
    categorySlug: "printers",
    brandSlug: "hp",
    price: 38000,
    salePrice: 35500,
    stock: 6,
    featured: true,
    ribbon: "SALE",
    shortDescription: "Mono laser · Duplex · Network",
    description: "<p>HP LaserJet Pro M404dn for fast office printing.</p>",
    tags: ["printers", "hp", "laser"],
    images: { primary: { url: img("1612815154858-60aa4f3f9c80") } },
  },
  {
    title: "Epson EcoTank L3250",
    slug: "epson-ecotank-l3250",
    categorySlug: "printers",
    brandSlug: "epson",
    price: 28000,
    salePrice: 26500,
    stock: 10,
    featured: true,
    bestSeller: true,
    shortDescription: "Wireless · Refillable tanks",
    description: "<p>Epson EcoTank L3250 all-in-one with ultra-low cost printing.</p>",
    tags: ["printers", "epson", "inkjet"],
    images: { primary: { url: img("1563986768609-322da13575f3") } },
  },
  {
    title: "Canon PIXMA G3420",
    slug: "canon-pixma-g3420",
    categorySlug: "printers",
    brandSlug: "canon",
    price: 24000,
    salePrice: 22500,
    stock: 8,
    featured: true,
    shortDescription: "MegaTank · Print · Copy · Scan",
    description: "<p>Canon PIXMA G3420 refillable ink tank multifunction printer.</p>",
    tags: ["printers", "canon"],
    images: { primary: { url: img("1586953208448-b95a79798f07") } },
  },

  // Accessories
  {
    title: "USB-C Fast Charger 65W GaN",
    slug: "usb-c-fast-charger-65w-gan",
    categorySlug: "accessories",
    brandSlug: "xiaomi",
    price: 4500,
    salePrice: 3900,
    stock: 50,
    featured: true,
    newArrival: true,
    ribbon: "SALE",
    shortDescription: "GaN · Laptop & phone charging",
    description: "<p>Compact 65W GaN USB-C charger for phones and laptops.</p>",
    tags: ["accessories", "charger"],
    images: { primary: { url: img("1625948515291-42dbbad70cd7") } },
  },
  {
    title: "Wireless Bluetooth Earbuds Pro",
    slug: "wireless-bluetooth-earbuds-pro",
    categorySlug: "accessories",
    brandSlug: "samsung",
    price: 8500,
    salePrice: 7500,
    stock: 35,
    featured: true,
    bestSeller: true,
    ribbon: "SALE",
    shortDescription: "ANC · Touch controls · 28hr case",
    description: "<p>Wireless earbuds with active noise cancellation and long battery life.</p>",
    tags: ["accessories", "audio"],
    images: { primary: { url: img("1590658268037-6bf12165a8df") } },
  },
  {
    title: "Laptop Sleeve 15.6\" - Premium",
    slug: "laptop-sleeve-15-6-premium",
    categorySlug: "accessories",
    brandSlug: "dell",
    price: 2500,
    salePrice: 1990,
    stock: 60,
    featured: true,
    shortDescription: "Padded · Water resistant",
    description: "<p>Protective 15.6-inch laptop sleeve with soft interior lining.</p>",
    tags: ["accessories", "sleeve"],
    images: { primary: { url: img("1541807084-5c52b6b3adef") } },
  },
  {
    title: "HDMI Cable 2.0 - 2 Metre",
    slug: "hdmi-cable-2-0-2m",
    categorySlug: "accessories",
    brandSlug: "hp",
    price: 1200,
    salePrice: 990,
    stock: 100,
    featured: true,
    shortDescription: "4K@60Hz · Braided",
    description: "<p>High-speed HDMI 2.0 cable for monitors, TVs, and projectors.</p>",
    tags: ["accessories", "cable"],
    images: { primary: { url: img("1558618666-fcd25c85cd64") } },
  },
];

async function upsertCategory(data) {
  return Category.findOneAndUpdate(
    { slug: data.slug },
    {
      $set: {
        name: data.name,
        description: data.description,
        image: data.image,
        status: "active",
        sortOrder: data.sortOrder,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async function upsertBrand(data) {
  return Brand.findOneAndUpdate(
    { slug: data.slug },
    {
      $set: {
        name: data.name,
        status: "active",
        image: data.image || { url: "" },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async function upsertProduct(data, categoryId, brandId) {
  return Product.findOneAndUpdate(
    { slug: data.slug },
    {
      $set: {
        title: data.title,
        description: data.description,
        shortDescription: data.shortDescription,
        price: data.price,
        salePrice: data.salePrice,
        sku: `YC-${data.slug.slice(0, 24).toUpperCase()}`,
        stock: data.stock,
        category: categoryId,
        brand: brandId,
        images: {
          primary: { url: img(data.slug) },
          gallery: [],
        },
        tags: data.tags || [],
        status: "active",
        featured: !!data.featured,
        newArrival: !!data.newArrival,
        bestSeller: !!data.bestSeller,
        ribbon: data.ribbon || "",
        currency: "KES",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async function seedCatalog() {
  await connectDatabase();

  console.log("Seeding categories...");
  const categoryMap = {};
  for (const cat of CATEGORIES) {
    const doc = await upsertCategory(cat);
    categoryMap[cat.slug] = doc._id;
    console.log(`  ✓ ${cat.name}`);
  }

  console.log("Seeding brands...");
  const brandMap = {};
  for (const brand of BRANDS) {
    const doc = await upsertBrand(brand);
    brandMap[brand.slug] = doc._id;
    console.log(`  ✓ ${brand.name}`);
  }

  console.log("Seeding products...");
  let count = 0;
  for (const product of PRODUCTS) {
    const categoryId = categoryMap[product.categorySlug];
    const brandId = brandMap[product.brandSlug];
    if (!categoryId) {
      console.warn(`  ! Skipping ${product.slug}: missing category ${product.categorySlug}`);
      continue;
    }
    await upsertProduct(product, categoryId, brandId || undefined);
    count += 1;
    console.log(`  ✓ ${product.title}`);
  }

  console.log("\nSeed complete:");
  console.log(`  Categories: ${CATEGORIES.length}`);
  console.log(`  Brands:     ${BRANDS.length}`);
  console.log(`  Products:   ${count}`);

  await disconnectDatabase();
  process.exit(0);
}

seedCatalog().catch(async (error) => {
  console.error("Catalog seed failed:", error);
  try {
    await disconnectDatabase();
  } catch {
    // ignore
  }
  process.exit(1);
});
