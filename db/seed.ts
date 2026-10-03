import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { categories, products, productImages, users } from "./schema";
import {
  categories as samples,
  products as sampleProducts,
} from "../lib/products";
import { hashPassword } from "../lib/password";
import { stockStatus } from "../services/catalog";
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
      for (const category of samples) {
        await tx
          .insert(categories)
          .values({
            name: category.name,
            slug: category.slug,
            imageUrl: category.image,
          })
          .onConflictDoNothing({ target: categories.slug });
      }
      for (const sample of sampleProducts) {
        const [category] = await tx
          .select()
          .from(categories)
          .where(eq(categories.slug, sample.categorySlug));
        const [product] = await tx
          .insert(products)
          .values({
            name: sample.name,
            slug: sample.slug,
            description: sample.description,
            price: String(sample.price),
            quantity: sample.stock,
            condition: sample.condition,
            categoryId: category.id,
            status: stockStatus(sample.stock),
          })
          .onConflictDoNothing({ target: products.slug })
          .returning();
        if (product)
          await tx
            .insert(productImages)
            .values({ productId: product.id, imageUrl: sample.image });
      }
    });
    console.log(
      "Admin and sample catalog seeded. Existing records were preserved.",
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
