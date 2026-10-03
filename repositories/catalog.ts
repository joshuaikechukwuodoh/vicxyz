import {
  and,
  eq,
  ilike,
  or,
  gte,
  lte,
  desc,
  asc,
  inArray,
  count,
} from "drizzle-orm";
import { getDb } from "@/db";
import { categories, products, productImages } from "@/db/schema";
import { productFilters } from "@/validators";
import type { z } from "zod";
export async function listCategories() {
  return getDb().select().from(categories).orderBy(asc(categories.name));
}
export async function findCategory(slug: string) {
  const [row] = await getDb()
    .select()
    .from(categories)
    .where(eq(categories.slug, slug));
  return row ?? null;
}
export async function listProducts(filters: z.infer<typeof productFilters>) {
  const db = getDb();
  const terms = [];
  if (filters.category) terms.push(eq(categories.slug, filters.category));
  if (filters.search) {
    const pattern = `%${filters.search.replace(/[\\%_]/g, "\\$&")}%`;
    terms.push(
      or(ilike(products.name, pattern), ilike(products.description, pattern)),
    );
  }
  if (filters.status) terms.push(eq(products.status, filters.status));
  if (filters.minPrice !== undefined)
    terms.push(gte(products.price, filters.minPrice));
  if (filters.maxPrice !== undefined)
    terms.push(lte(products.price, filters.maxPrice));
  const where = and(...terms);
  const rows = await db
    .select({ product: products, category: categories })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(where)
    .orderBy(desc(products.createdAt), asc(products.id))
    .limit(filters.limit)
    .offset((filters.page - 1) * filters.limit);
  const [{ total }] = await db
    .select({ total: count() })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(where);
  const images = rows.length
    ? await db
        .select()
        .from(productImages)
        .where(
          inArray(
            productImages.productId,
            rows.map((r) => r.product.id),
          ),
        )
        .orderBy(asc(productImages.position), asc(productImages.id))
    : [];
  return {
    items: rows.map((row) => ({
      ...row.product,
      category: row.category,
      images: images.filter((i) => i.productId === row.product.id),
    })),
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    },
  };
}
export async function findProduct(slug: string) {
  const db = getDb();
  const [row] = await db
    .select({ product: products, category: categories })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.slug, slug));
  if (!row) return null;
  const images = await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, row.product.id))
    .orderBy(asc(productImages.position), asc(productImages.id));
  return { ...row.product, category: row.category, images };
}
