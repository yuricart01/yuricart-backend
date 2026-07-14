const { createApp } = require("./app");
const { connectDatabase } = require("./config/db");
const { env } = require("./config/env");

async function startServer() {
  await connectDatabase();

  const app = createApp();

  app.listen(env.PORT, () => {
    console.log(`Yuricart API running on port ${env.PORT} (${env.NODE_ENV})`);
    console.log(`Health: http://localhost:${env.PORT}/api/v1/health`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
