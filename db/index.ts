import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
let database: ReturnType<typeof drizzle<typeof schema>> | undefined;
export function getDb() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is not configured");
  if (!database)
    database = drizzle(
      postgres(process.env.DATABASE_URL, {
        max: 10,
        prepare: false,
        connect_timeout: 10,
      }),
      { schema },
    );
  return database;
}
export type Database = ReturnType<typeof getDb>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
