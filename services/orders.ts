import { createHash } from "node:crypto";
import { eq, inArray, asc, desc, sql, count } from "drizzle-orm";
import { getDb, type Transaction } from "@/db";
import { orders, orderItems, orderCounters, products } from "@/db/schema";
import { ApiError } from "@/lib/api";
import { toCents, fromCents } from "@/lib/money";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { stockStatus } from "./catalog";
import type { CreateOrder } from "@/validators";
import type { OrderStatus } from "@/types/api";

function publicOrder(
  order: typeof orders.$inferSelect,
  items: (typeof orderItems.$inferSelect)[],
) {
  const {
    requestHash: _hash,
    idempotencyKey: _key,
    stockReduced: _stock,
    ...safe
  } = order;
  return { ...safe, items };
}
function checkout(
  order: typeof orders.$inferSelect,
  items: (typeof orderItems.$inferSelect)[],
) {
  const lines = items.map(
    (item, i) =>
      `${i + 1}. ${item.productName}\nQuantity: ${item.quantity} | Unit price: ₦${Number(item.unitPrice).toLocaleString("en-NG")} | Subtotal: ₦${Number(item.subtotal).toLocaleString("en-NG")}`,
  );
  const message = `Hello Victor Pedro, I would like to discuss order ${order.reference}.\n\nName: ${order.customerName}\nPhone: ${order.customerPhone}\n\n${lines.join("\n\n")}\n\nEstimated total: ₦${Number(order.totalAmount).toLocaleString("en-NG")}\n\nPlease confirm availability. I would like to negotiate the final price and discuss delivery and payment. Thank you.`;
  return {
    order: publicOrder(order, items),
    whatsapp: { url: getWhatsAppUrl(message), message },
  };
}
function assertSameRequest(order: typeof orders.$inferSelect, hash: string) {
  if (order.requestHash !== hash)
    throw new ApiError(
      409,
      "This checkout key has already been used for a different order",
    );
}
export async function createOrder(input: CreateOrder, idempotencyKey: string) {
  const sorted = [...input.items].sort((a, b) =>
    a.productId.localeCompare(b.productId),
  );
  const requestHash = createHash("sha256")
    .update(JSON.stringify({ ...input, items: sorted }))
    .digest("hex");
  return getDb().transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(orders)
      .where(eq(orders.idempotencyKey, idempotencyKey));
    if (existing) {
      assertSameRequest(existing, requestHash);
      return checkout(
        existing,
        await tx
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, existing.id))
          .orderBy(asc(orderItems.id)),
      );
    }
    const available = await tx
      .select()
      .from(products)
      .where(
        inArray(
          products.id,
          sorted.map((i) => i.productId),
        ),
      )
      .orderBy(asc(products.id))
      .for("update");
    const [retry] = await tx
      .select()
      .from(orders)
      .where(eq(orders.idempotencyKey, idempotencyKey));
    if (retry) {
      assertSameRequest(retry, requestHash);
      return checkout(
        retry,
        await tx
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, retry.id)),
      );
    }
    const snapshots = sorted.map((item) => {
      const product = available.find((p) => p.id === item.productId);
      if (!product)
        throw new ApiError(422, "An item in your cart is no longer available");
      if (product.status === "OUT_OF_STOCK" || product.quantity < item.quantity)
        throw new ApiError(409, `Insufficient stock for ${product.name}`);
      const amount = toCents(product.price) * BigInt(item.quantity);
      if (amount > BigInt(Number.MAX_SAFE_INTEGER))
        throw new ApiError(422, "Order value exceeds the supported limit");
      const subtotal = fromCents(amount);
      return {
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: item.quantity,
        subtotal,
      };
    });
    const total = snapshots.reduce((sum, i) => sum + toCents(i.subtotal), 0n);
    if (total > BigInt(Number.MAX_SAFE_INTEGER))
      throw new ApiError(422, "Order value exceeds the supported limit");
    const totalAmount = fromCents(total);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const part = (type: string) => parts.find((p) => p.type === type)!.value;
    const day = `${part("year")}-${part("month")}-${part("day")}`;
    const [counter] = await tx
      .insert(orderCounters)
      .values({ day, value: 1 })
      .onConflictDoUpdate({
        target: orderCounters.day,
        set: { value: sql`${orderCounters.value} + 1` },
      })
      .returning();
    const reference = `MOT-${day.replace(/-/g, "")}-${String(counter.value).padStart(4, "0")}`;
    const [order] = await tx
      .insert(orders)
      .values({
        reference,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail ?? null,
        totalAmount,
        idempotencyKey,
        requestHash,
      })
      .onConflictDoNothing({ target: orders.idempotencyKey })
      .returning();
    if (!order) {
      const [saved] = await tx
        .select()
        .from(orders)
        .where(eq(orders.idempotencyKey, idempotencyKey));
      assertSameRequest(saved, requestHash);
      return checkout(
        saved,
        await tx
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, saved.id))
          .orderBy(asc(orderItems.id)),
      );
    }
    const items = await tx
      .insert(orderItems)
      .values(snapshots.map((item) => ({ ...item, orderId: order.id })))
      .returning();
    return checkout(order, items);
  });
}
const transitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONTACTED", "CONFIRMED", "CANCELLED"],
  CONTACTED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CANCELLED", "COMPLETED"],
  CANCELLED: [],
  COMPLETED: [],
};
async function adjustStock(
  tx: Transaction,
  items: (typeof orderItems.$inferSelect)[],
  restore: boolean,
) {
  if (items.some((i) => !i.productId))
    throw new ApiError(409, "An ordered product has been deleted");
  const ids = items.map((i) => i.productId!);
  const rows = await tx
    .select()
    .from(products)
    .where(inArray(products.id, ids))
    .orderBy(asc(products.id))
    .for("update");
  for (const item of items) {
    const product = rows.find((p) => p.id === item.productId);
    if (!product)
      throw new ApiError(409, "An ordered product has been deleted");
    if (
      !restore &&
      (product.status === "OUT_OF_STOCK" || product.quantity < item.quantity)
    )
      throw new ApiError(409, `Insufficient stock for ${item.productName}`);
    const quantity =
      product.quantity + (restore ? item.quantity : -item.quantity);
    if (quantity < 0 || quantity > 2147483647)
      throw new ApiError(409, "Stock adjustment exceeds the supported range");
    await tx
      .update(products)
      .set({ quantity, status: stockStatus(quantity), updatedAt: new Date() })
      .where(eq(products.id, product.id));
  }
}
export async function changeOrderStatus(id: string, status: OrderStatus) {
  return getDb().transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .for("update");
    if (!order) throw new ApiError(404, "Order not found");
    const items = await tx
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id))
      .orderBy(asc(orderItems.id));
    if (order.status === status) return publicOrder(order, items);
    if (!transitions[order.status].includes(status))
      throw new ApiError(409, `Cannot change ${order.status} to ${status}`);
    let stockReduced = order.stockReduced;
    if (status === "CONFIRMED" && !stockReduced) {
      await adjustStock(tx, items, false);
      stockReduced = true;
    }
    if (status === "CANCELLED" && stockReduced) {
      await adjustStock(tx, items, true);
      stockReduced = false;
    }
    const [updated] = await tx
      .update(orders)
      .set({ status, stockReduced, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return publicOrder(updated, items);
  });
}
export async function listOrders(filters: {
  status?: OrderStatus;
  page: number;
  limit: number;
}) {
  const db = getDb();
  const where = filters.status ? eq(orders.status, filters.status) : undefined;
  const rows = await db
    .select()
    .from(orders)
    .where(where)
    .orderBy(desc(orders.createdAt), asc(orders.id))
    .limit(filters.limit)
    .offset((filters.page - 1) * filters.limit);
  const [{ total }] = await db
    .select({ total: count() })
    .from(orders)
    .where(where);
  return {
    items: rows.map(
      ({ requestHash: _hash, idempotencyKey: _key, ...order }) => order,
    ),
    pagination: { page: filters.page, limit: filters.limit, total },
  };
}
export async function findOrder(id: string) {
  const db = getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) throw new ApiError(404, "Order not found");
  return publicOrder(
    order,
    await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id))
      .orderBy(asc(orderItems.id)),
  );
}
