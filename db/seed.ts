import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { categories, users } from "./schema";
import { defaultCategories } from "./default-categories";
import { hashPassword } from "../lib/password";
import { eq } from "drizzle-orm";
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL");
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12 || password.length > 256)
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (12–256 characters)");
  const client = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
  const db = drizzle(client);
  try {
    const passwordHash = await hashPassword(password);
    await db.transaction(async (tx) => {
      await tx
        .insert(users)
        .values({
          name: process.env.ADMIN_NAME ?? "Victor Pedro",
          email,
          passwordHash,
          role: "ADMIN",
        })
        .onConflictDoNothing({ target: users.email });
      // Rename the existing category without breaking any product references.
      const existing = await tx
        .select()
        .from(categories)
        .where(eq(categories.slug, "auto-parts"));
      if (!existing.length)
        await tx
          .update(categories)
          .set({
            name: "Auto Parts",
            slug: "auto-parts",
            updatedAt: new Date(),
          })
          .where(eq(categories.slug, "motor-parts"));
      for (const category of defaultCategories)
        await tx
          .insert(categories)
          .values(category)
          .onConflictDoNothing({ target: categories.slug });
    });
    console.log(
      "Admin and categories initialized. No sample products were added.",
    );
  } finally {
    await client.end();
  }
}
main().catch(() => {
  console.error(
    "Seed failed. Check environment settings, database connection, and migrations.",
  );
  process.exitCode = 1;
});
