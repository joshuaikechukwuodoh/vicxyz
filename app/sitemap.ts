import type { MetadataRoute } from "next";
import { SITE } from "@/lib/config";
import { getDb } from "@/db";
import { categories, products } from "@/db/schema";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = getDb();
  const [categoryRows, productRows] = await Promise.all([
    db
      .select({ slug: categories.slug, updatedAt: categories.updatedAt })
      .from(categories),
    db
      .select({ slug: products.slug, updatedAt: products.updatedAt })
      .from(products),
  ]);
  return [
    ...["/", "/shop", "/about", "/contact"].map((path) => ({
      url: new URL(path, SITE.url).href,
    })),
    ...categoryRows.map((row) => ({
      url: SITE.url + "/category/" + row.slug,
      lastModified: row.updatedAt,
    })),
    ...productRows.map((row) => ({
      url: SITE.url + "/product/" + row.slug,
      lastModified: row.updatedAt,
    })),
  ];
}
