import { eq, and } from "drizzle-orm";
import { getDb } from "@/db";
import {
  categories,
  products,
  productImages,
  productVideos,
  orderItems,
  orders,
} from "@/db/schema";
import { ApiError } from "@/lib/api";
import type { ProductInput } from "@/validators";
export function stockStatus(quantity: number) {
  return quantity === 0
    ? ("OUT_OF_STOCK" as const)
    : quantity <= 5
      ? ("LOW_STOCK" as const)
      : ("IN_STOCK" as const);
}
export async function saveCategory(
  data:
    typeof categories.$inferInsert | Partial<typeof categories.$inferInsert>,
  id?: string,
) {
  const db = getDb();
  const [row] = id
    ? await db
        .update(categories)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(categories.id, id))
        .returning()
    : await db
        .insert(categories)
        .values(data as typeof categories.$inferInsert)
        .returning();
  if (!row) throw new ApiError(404, "Category not found");
  return row;
}
export async function deleteCategory(id: string) {
  const [row] = await getDb()
    .delete(categories)
    .where(eq(categories.id, id))
    .returning({ id: categories.id });
  if (!row) throw new ApiError(404, "Category not found");
  return row;
}
export async function saveProduct(
  input: ProductInput | Partial<ProductInput>,
  id?: string,
) {
  return getDb().transaction(async (tx) => {
    let previous: typeof products.$inferSelect | undefined;
    if (id) {
      [previous] = await tx
        .select()
        .from(products)
        .where(eq(products.id, id))
        .for("update");
      if (!previous) throw new ApiError(404, "Product not found");
    }
    const { images, videos, ...fields } = input;
    const quantity = fields.quantity ?? previous!.quantity;
    const status =
      fields.status ??
      (fields.quantity !== undefined
        ? stockStatus(quantity)
        : previous!.status);
    if (quantity === 0 && status !== "OUT_OF_STOCK")
      throw new ApiError(422, "Zero quantity requires OUT_OF_STOCK status");
    const [row] = id
      ? await tx
          .update(products)
          .set({ ...fields, status, updatedAt: new Date() })
          .where(eq(products.id, id))
          .returning()
      : await tx
          .insert(products)
          .values({
            ...(fields as Omit<ProductInput, "images" | "videos">),
            status,
          })
          .returning();
    if (images) {
      await tx.delete(productImages).where(eq(productImages.productId, row.id));
      await tx.insert(productImages).values(
        images.map((imageUrl, position) => ({
          productId: row.id,
          imageUrl,
          position,
        })),
      );
    }
    if (videos) {
      await tx.delete(productVideos).where(eq(productVideos.productId, row.id));
      if (videos.length)
        await tx
          .insert(productVideos)
          .values(
            videos.map((videoUrl, position) => ({
              productId: row.id,
              videoUrl,
              position,
            })),
          );
    }
    return {
      ...row,
      videos: await tx
        .select()
        .from(productVideos)
        .where(eq(productVideos.productId, row.id)),
      images: await tx
        .select()
        .from(productImages)
        .where(eq(productImages.productId, row.id)),
    };
  });
}
export async function deleteProduct(id: string) {
  return getDb().transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(products)
      .where(eq(products.id, id))
      .for("update");
    if (!row) throw new ApiError(404, "Product not found");
    const active = await tx
      .select({ id: orders.id })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(and(eq(orderItems.productId, id), eq(orders.status, "CONFIRMED")))
      .limit(1);
    if (active.length)
      throw new ApiError(
        409,
        "Complete or cancel confirmed orders containing this product before deleting it",
      );
    await tx.delete(products).where(eq(products.id, id));
    return { id };
  });
}
