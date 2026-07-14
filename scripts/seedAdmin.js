const dotenv = require("dotenv");
const { connectDatabase, disconnectDatabase } = require("../src/config/db");
const { env } = require("../src/config/env");
const { User } = require("../src/models/User");

dotenv.config();

async function seedAdmin() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    console.error(
      "Set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env before running seed:admin",
    );
    process.exit(1);
  }

  await connectDatabase();

  const existing = await User.findOne({ email: env.ADMIN_EMAIL.toLowerCase() });

  if (existing) {
    console.log(`Admin already exists: ${existing.email}`);
    await disconnectDatabase();
    process.exit(0);
  }

  await User.create({
    name: env.ADMIN_NAME || "Admin",
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
    role: "admin",
    status: "active",
  });

  console.log(`Admin user created: ${env.ADMIN_EMAIL}`);
  await disconnectDatabase();
  process.exit(0);
}

seedAdmin().catch(async (error) => {
  console.error("Seed failed:", error);
  await disconnectDatabase();
  process.exit(1);
});
