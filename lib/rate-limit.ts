import { createHash } from "node:crypto";
import { sql, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { rateLimits } from "@/db/schema";
import { ApiError } from "./api";
export async function consumeRateLimit(
  identity: string,
  maximum: number,
  seconds: number,
) {
  const key = createHash("sha256").update(identity).digest("hex");
  const db = getDb();
  const [bucket] = await db
    .insert(rateLimits)
    .values({ key, count: 1, expiresAt: new Date(Date.now() + seconds * 1000) })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`CASE WHEN ${rateLimits.expiresAt} <= now() THEN 1 ELSE ${rateLimits.count} + 1 END`,
        expiresAt: sql`CASE WHEN ${rateLimits.expiresAt} <= now() THEN now() + ${seconds} * interval '1 second' ELSE ${rateLimits.expiresAt} END`,
      },
    })
    .returning();
  if (Math.random() < 0.02)
    await db.delete(rateLimits).where(lt(rateLimits.expiresAt, new Date()));
  if (bucket.count > maximum)
    throw new ApiError(429, "Too many requests. Please try again later.");
}
