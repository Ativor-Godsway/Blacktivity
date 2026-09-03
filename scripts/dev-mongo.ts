/**
 * Local-only: starts an in-memory MongoDB and writes its URI to .env.local.
 * Used for verifying the build and seed without an Atlas cluster.
 * Not used in production — Vercel uses MONGODB_URI from the dashboard.
 */
import { MongoMemoryServer } from "mongodb-memory-server";
import { writeFileSync } from "node:fs";

async function main() {
  const server = await MongoMemoryServer.create({
    instance: { dbName: "blacktivity", port: 27717 },
  });

  const uri = server.getUri("blacktivity");
  writeFileSync(".mongo-uri", uri);
  console.log("MONGO_READY " + uri);

  process.on("SIGTERM", async () => {
    await server.stop();
    process.exit(0);
  });

  // Keep the process alive.
  setInterval(() => {}, 1 << 30);
}

main();
