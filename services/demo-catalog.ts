import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { products, productImages, categories } from "@/db/schema";
import { deleteProduct } from "./catalog";
import { defaultCategories } from "@/db/default-categories";
const demoSlugs = [
  "honda-cbr-500r",
  "toyota-camry-xse",
  "yamaha-mt-07",
  "performance-brake-kit",
  "luxury-steering-wheel",
  "mercedes-benz-c300",
];
export async function clearDemoCatalog() {
  const db = getDb();
  const candidates = await db
    .select({ id: products.id, imageUrl: productImages.imageUrl })
    .from(products)
    .innerJoin(productImages, eq(products.id, productImages.productId))
    .where(inArray(products.slug, demoSlugs));
  const demos = [
    ...new Set(
      candidates
        .filter((p) => {
          try {
            return new URL(p.imageUrl).hostname === "images.unsplash.com";
          } catch {
            return false;
          }
        })
        .map((p) => p.id),
    ),
  ];
  let removed = 0;
  let skipped = 0;
  for (const id of demos) {
    // Catalog deletion preserves order snapshots and refuses active confirmed orders.
    try {
      await deleteProduct(id);
      removed++;
    } catch (error) {
      if (error instanceof Error && "status" in error && error.status === 409)
        skipped++;
      else throw error;
    }
  }
  const current = await db.select().from(categories);
  for (const category of current) {
    if (!category.imageUrl.startsWith("https://images.unsplash.com/")) continue;
    const match = defaultCategories.find(
      (c) =>
        c.slug ===
        (category.slug === "motor-parts" ? "auto-parts" : category.slug),
    );
    if (match)
      await db
        .update(categories)
        .set({ imageUrl: match.imageUrl, updatedAt: new Date() })
        .where(eq(categories.id, category.id));
  }
  return { removed, skipped };
}
