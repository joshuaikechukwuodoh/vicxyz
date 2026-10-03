import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL in .env");
  const client = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
  try {
    await migrate(drizzle(client), { migrationsFolder: "./db/migrations" });
    console.log("Database migrations applied");
  } finally {
    await client.end();
  }
}
main().catch(() => {
  console.error(
    "Migration failed. Check database credentials and connectivity.",
  );
  process.exitCode = 1;
});
