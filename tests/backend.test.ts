import {
  beforeAll,
  beforeEach,
  afterAll,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { createOrder, changeOrderStatus, findOrder } from "@/services/orders";
import { saveProduct, deleteProduct, deleteCategory } from "@/services/catalog";
import { listProducts, findProduct } from "@/repositories/catalog";
import { orderSchema, productFilters } from "@/validators";
import { hashPassword, verifyPassword } from "@/lib/password";
import { login, requireAdmin, logout } from "@/lib/auth";
import { readLimitedBody } from "@/lib/api";
import { toCents, fromCents } from "@/lib/money";
import { api } from "@/lib/api";
import { POST as orderPost } from "@/app/api/orders/route";
import { POST as loginPost } from "@/app/api/admin/auth/login/route";
import { GET as productsGet } from "@/app/api/products/route";
import { clearDemoCatalog } from "@/services/demo-catalog";
import { productSchema, productPatch } from "@/validators";
import { consumeRateLimit } from "@/lib/rate-limit";

const holder = vi.hoisted(() => ({
  db: null as any,
  cookies: new Map<string, string>(),
  options: [] as Record<string, unknown>[],
}));
vi.mock("@/db", () => ({ getDb: () => holder.db }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (key: string) =>
      holder.cookies.has(key) ? { value: holder.cookies.get(key) } : undefined,
    set: (key: string, value: string, options: Record<string, unknown>) => {
      holder.cookies.set(key, value);
      holder.options.push(options);
    },
  }),
}));
let pg: PGlite;
let categoryId: string;
let productId: string;
const db = () => holder.db as ReturnType<typeof drizzle<typeof schema>>;
const request = (
  path: string,
  method = "GET",
  body?: unknown,
  headers: Record<string, string> = {},
) =>
  new Request(`http://localhost:3000${path}`, {
    method,
    headers: {
      Origin: "http://localhost:3000",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
const context = { params: Promise.resolve({}) };
const input = (quantity = 2) => ({
  customerName: "Test Buyer",
  customerPhone: "08158124025",
  items: [{ productId, quantity }],
});
const stock = async (id = productId) =>
  (
    await db().select().from(schema.products).where(eq(schema.products.id, id))
  )[0];
beforeAll(async () => {
  pg = new PGlite();
  holder.db = drizzle(pg, { schema });
  for (const filename of readdirSync("db/migrations")
    .filter((n) => n.endsWith(".sql"))
    .sort())
    await pg.exec(readFileSync(`db/migrations/${filename}`, "utf8"));
  process.env.AUTH_SECRET = "test-secret-with-at-least-32-characters";
  process.env.APP_URL = "http://localhost:3000";
});
beforeEach(async () => {
  await pg.exec(
    "TRUNCATE TABLE users, categories, products, product_images, orders, order_items, order_counters, admin_sessions, rate_limits CASCADE",
  );
  holder.cookies.clear();
  holder.options = [];
  const [category] = await db()
    .insert(schema.categories)
    .values({
      name: "Cars",
      slug: "cars",
      imageUrl: "https://example.com/cars.jpg",
    })
    .returning();
  categoryId = category.id;
  const product = await saveProduct({
    name: "Test Car",
    slug: "test-car",
    description: "A test car",
    price: "100.25",
    quantity: 5,
    condition: "Used",
    categoryId,
    images: ["https://example.com/car.jpg", "https://example.com/car2.jpg"],
  });
  productId = product.id;
});
afterAll(async () => {
  await pg?.close();
});

describe("saved orders and stock transactions", () => {
  it("uses database prices, saves snapshots, leaves stock untouched and includes the reference in WhatsApp", async () => {
    const result = await createOrder(input(), randomUUID());
    expect(result.order.totalAmount).toBe("200.50");
    expect(result.order.items[0]).toMatchObject({
      productName: "Test Car",
      unitPrice: "100.25",
      quantity: 2,
      subtotal: "200.50",
    });
    expect(result.order.reference).toMatch(/^MOT-\d{8}-0001$/);
    expect(result.order).not.toHaveProperty("requestHash");
    expect((await stock()).quantity).toBe(5);
    const url = new URL(result.whatsapp.url);
    expect(url.pathname).toBe("/2348158124025");
    expect(url.searchParams.get("text")).toContain(result.order.reference);
    expect(url.searchParams.get("text")).toContain("negotiate");
    await db()
      .update(schema.products)
      .set({ price: "999.99", name: "Changed car" })
      .where(eq(schema.products.id, productId));
    const stored = await findOrder(result.order.id);
    expect(stored.items[0].unitPrice).toBe("100.25");
    expect(stored.items[0].productName).toBe("Test Car");
  });
  it("reuses idempotency keys and rejects a changed request", async () => {
    const key = randomUUID();
    const first = await createOrder(input(), key);
    const repeat = await createOrder(input(), key);
    expect(repeat.order.id).toBe(first.order.id);
    await expect(createOrder(input(3), key)).rejects.toMatchObject({
      status: 409,
    });
    expect(await db().select().from(schema.orders)).toHaveLength(1);
  });
  it("creates unique references across concurrent orders", async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () => createOrder(input(1), randomUUID())),
    );
    expect(new Set(results.map((r) => r.order.reference)).size).toBe(5);
    expect((await stock()).quantity).toBe(5);
  });
  it("concurrent retries create one order", async () => {
    const key = randomUUID();
    const results = await Promise.all([
      createOrder(input(), key),
      createOrder(input(), key),
    ]);
    expect(results[0].order.id).toBe(results[1].order.id);
    expect(await db().select().from(schema.orders)).toHaveLength(1);
  });
  it("confirms once even when confirmation is retried", async () => {
    const { order } = await createOrder(input(), randomUUID());
    await Promise.all([
      changeOrderStatus(order.id, "CONFIRMED"),
      changeOrderStatus(order.id, "CONFIRMED"),
    ]);
    expect((await stock()).quantity).toBe(3);
  });
  it("does not oversell when two admins confirm competing orders", async () => {
    const a = await createOrder(input(4), randomUUID());
    const b = await createOrder(input(4), randomUUID());
    const results = await Promise.allSettled([
      changeOrderStatus(a.order.id, "CONFIRMED"),
      changeOrderStatus(b.order.id, "CONFIRMED"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await stock()).quantity).toBe(1);
  });
  it("rolls back every stock change when any order item is unavailable", async () => {
    const second = await saveProduct({
      name: "Second Car",
      slug: "second-car",
      description: "Second",
      price: "10.00",
      quantity: 2,
      condition: "Used",
      categoryId,
      images: ["https://example.com/car.jpg"],
    });
    const { order } = await createOrder(
      {
        ...input(),
        items: [
          { productId, quantity: 2 },
          { productId: second.id, quantity: 2 },
        ],
      },
      randomUUID(),
    );
    await db()
      .update(schema.products)
      .set({ quantity: 1 })
      .where(eq(schema.products.id, second.id));
    await expect(
      changeOrderStatus(order.id, "CONFIRMED"),
    ).rejects.toMatchObject({ status: 409 });
    expect((await stock()).quantity).toBe(5);
    expect((await findOrder(order.id)).status).toBe("PENDING");
  });
  it("cancelling an unconfirmed order does not change stock", async () => {
    const { order } = await createOrder(input(), randomUUID());
    await changeOrderStatus(order.id, "CANCELLED");
    expect((await stock()).quantity).toBe(5);
    await expect(
      changeOrderStatus(order.id, "CONFIRMED"),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("cancelling a confirmed order restores stock exactly once", async () => {
    const { order } = await createOrder(input(), randomUUID());
    await changeOrderStatus(order.id, "CONFIRMED");
    await changeOrderStatus(order.id, "CANCELLED");
    await changeOrderStatus(order.id, "CANCELLED");
    expect((await stock()).quantity).toBe(5);
  });
  it("completed orders are terminal and retain consumed stock", async () => {
    const { order } = await createOrder(input(), randomUUID());
    await changeOrderStatus(order.id, "CONFIRMED");
    await changeOrderStatus(order.id, "COMPLETED");
    await expect(
      changeOrderStatus(order.id, "CANCELLED"),
    ).rejects.toMatchObject({ status: 409 });
    expect((await stock()).quantity).toBe(3);
  });
  it("rejects missing, unavailable, and insufficient products without saving an order", async () => {
    await expect(createOrder(input(6), randomUUID())).rejects.toMatchObject({
      status: 409,
    });
    await expect(
      createOrder(
        { ...input(), items: [{ productId: randomUUID(), quantity: 1 }] },
        randomUUID(),
      ),
    ).rejects.toMatchObject({ status: 422 });
    await saveProduct({ status: "OUT_OF_STOCK" }, productId);
    await expect(createOrder(input(), randomUUID())).rejects.toMatchObject({
      status: 409,
    });
    expect(await db().select().from(schema.orders)).toHaveLength(0);
  });
});
describe("catalog and database constraints", () => {
  it("returns multiple images and supports combined filters and pagination", async () => {
    const result = await listProducts(
      productFilters.parse({
        category: "cars",
        search: "Test",
        status: "LOW_STOCK",
        minPrice: "100",
        maxPrice: "101",
        limit: 1,
      }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].images).toHaveLength(2);
    expect(result.pagination.total).toBe(1);
    expect(
      (await listProducts(productFilters.parse({ search: "%" }))).items,
    ).toHaveLength(0);
    expect(
      (await listProducts(productFilters.parse({ minPrice: "200" }))).items,
    ).toHaveLength(0);
  });
  it("allows editing price, quantity, status and replacing images", async () => {
    const updated = await saveProduct(
      {
        price: "150.50",
        quantity: 10,
        images: ["https://example.com/new.jpg"],
      },
      productId,
    );
    expect(updated).toMatchObject({
      price: "150.50",
      quantity: 10,
      status: "IN_STOCK",
    });
    expect(updated.images).toHaveLength(1);
    await expect(
      saveProduct({ quantity: 0, status: "IN_STOCK" }, productId),
    ).rejects.toMatchObject({ status: 422 });
  });
  it("prevents negative stock at database level", async () => {
    await expect(
      db()
        .update(schema.products)
        .set({ quantity: -1 })
        .where(eq(schema.products.id, productId)),
    ).rejects.toThrow();
    expect((await stock()).quantity).toBe(5);
  });
  it("preserves order snapshots after deleting a product", async () => {
    const { order } = await createOrder(input(), randomUUID());
    await deleteProduct(productId);
    const stored = await findOrder(order.id);
    expect(stored.items[0]).toMatchObject({
      productId: null,
      productName: "Test Car",
      unitPrice: "100.25",
    });
    await expect(
      changeOrderStatus(order.id, "CONFIRMED"),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("blocks deleting products in active confirmed orders and categories still in use", async () => {
    const { order } = await createOrder(input(), randomUUID());
    await changeOrderStatus(order.id, "CONFIRMED");
    await expect(deleteProduct(productId)).rejects.toMatchObject({
      status: 409,
    });
    await expect(deleteCategory(categoryId)).rejects.toThrow();
  });
});
describe("product videos and demo cleanup", () => {
  it("persists, reads, replaces, and removes ordered product videos", async () => {
    await saveProduct(
      {
        videos: [
          "https://example.com/front.mp4",
          "https://example.com/interior.webm",
        ],
      },
      productId,
    );
    let product = await findProduct("test-car");
    expect(product?.videos.map((v) => v.videoUrl)).toEqual([
      "https://example.com/front.mp4",
      "https://example.com/interior.webm",
    ]);
    expect(
      (await listProducts(productFilters.parse({}))).items[0].videos,
    ).toHaveLength(2);
    await saveProduct({ name: "Updated test car" }, productId);
    expect((await findProduct("test-car"))?.videos).toHaveLength(2);
    await saveProduct(
      { videos: ["https://example.com/replacement.mp4"] },
      productId,
    );
    expect((await findProduct("test-car"))?.videos).toHaveLength(1);
    await saveProduct({ videos: [] }, productId);
    expect((await findProduct("test-car"))?.videos).toHaveLength(0);
  });
  it("validates video counts and HTTPS URLs while keeping a cover photo required", () => {
    expect(
      productPatch.safeParse({ videos: ["javascript:alert(1)"] }).success,
    ).toBe(false);
    expect(
      productPatch.safeParse({ videos: ["http://example.com/car.mp4"] })
        .success,
    ).toBe(false);
    expect(
      productPatch.safeParse({
        videos: Array(4).fill("https://example.com/car.mp4"),
      }).success,
    ).toBe(false);
    expect(productPatch.safeParse({ videos: [] }).success).toBe(true);
    expect(productPatch.safeParse({ images: [] }).success).toBe(false);
  });
  it("removes only demo listings and preserves uploads, confirmed orders, and snapshots", async () => {
    const sample = {
      name: "Demo car",
      description: "Demo",
      price: "100.00",
      quantity: 5,
      condition: "Used",
      categoryId,
      images: ["https://images.unsplash.com/photo-demo"],
    };
    const demo = await saveProduct({ ...sample, slug: "honda-cbr-500r" });
    const real = await saveProduct({
      ...sample,
      slug: "toyota-camry-xse",
      images: ["https://test.ufs.sh/f/real.jpg"],
    });
    const confirmed = await saveProduct({ ...sample, slug: "yamaha-mt-07" });
    const pendingOrder = await createOrder(
      { ...input(), items: [{ productId: demo.id, quantity: 1 }] },
      randomUUID(),
    );
    const confirmedOrder = await createOrder(
      { ...input(), items: [{ productId: confirmed.id, quantity: 1 }] },
      randomUUID(),
    );
    await changeOrderStatus(confirmedOrder.order.id, "CONFIRMED");
    expect(await clearDemoCatalog()).toEqual({ removed: 1, skipped: 1 });
    expect(await findProduct("honda-cbr-500r")).toBeNull();
    expect((await findProduct("toyota-camry-xse"))?.id).toBe(real.id);
    expect((await findProduct("yamaha-mt-07"))?.id).toBe(confirmed.id);
    expect((await findOrder(pendingOrder.order.id)).items[0]).toMatchObject({
      productId: null,
      productName: "Demo car",
      unitPrice: "100.00",
    });
  });
});
describe("validation and public routes", () => {
  it("rejects client prices, totals, duplicate products and invalid quantities", () => {
    expect(
      orderSchema.safeParse({ ...input(), totalAmount: "1" }).success,
    ).toBe(false);
    expect(
      orderSchema.safeParse({
        ...input(),
        items: [{ productId, quantity: 1, price: 1 }],
      }).success,
    ).toBe(false);
    expect(
      orderSchema.safeParse({
        ...input(),
        items: [
          { productId, quantity: 1 },
          { productId, quantity: 2 },
        ],
      }).success,
    ).toBe(false);
    expect(orderSchema.safeParse(input(-1)).success).toBe(false);
    expect(orderSchema.safeParse(input(1.5)).success).toBe(false);
    expect(
      productFilters.safeParse({ minPrice: "200", maxPrice: "100" }).success,
    ).toBe(false);
  });
  it("returns a saved order and checkout information from POST /api/orders", async () => {
    const response = await orderPost(
      request("/api/orders", "POST", input(), {
        "Idempotency-Key": randomUUID(),
      }),
      context,
    );
    expect(response.status).toBe(201);
    const result = await response.json();
    expect(result.data.order.reference).toMatch(/^MOT-/);
    expect(result.data.whatsapp.url).toMatch(/^https:\/\/wa.me\/2348158124025/);
  });
  it("returns validation errors for tampered orders and invalid product filters", async () => {
    expect(
      (
        await orderPost(
          request("/api/orders", "POST", { ...input(), totalAmount: 1 }),
          context,
        )
      ).status,
    ).toBe(422);
    expect(
      (await productsGet(request("/api/products?status=WRONG"), context))
        .status,
    ).toBe(422);
    expect(
      (
        await orderPost(
          request("/api/orders", "POST", input(), {
            Origin: "https://evil.example",
          }),
          context,
        )
      ).status,
    ).toBe(403);
  });
  it("handles malformed JSON without exposing internal errors", async () => {
    const response = await orderPost(
      new Request("http://localhost:3000/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }),
      context,
    );
    expect(response.status).toBe(400);
    const safe = api(async () => {
      throw new Error("passwordHash secret DATABASE_URL");
    });
    const result = await safe(request("/api/test"), context);
    expect(result.status).toBe(500);
    expect(JSON.stringify(await result.json())).not.toContain("DATABASE_URL");
  });
  it("rejects oversized streamed JSON requests without requiring a content-length header", async () => {
    const large = new Request("http://localhost:3000/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "x".repeat(65537),
    });
    expect((await orderPost(large, context)).status).toBe(413);
    await expect(
      readLimitedBody(
        new Request("http://localhost:3000/api/test", {
          method: "POST",
          headers: { "Content-Length": "1000" },
          body: "small",
        }),
        100,
      ),
    ).rejects.toMatchObject({ status: 413 });
  });
  it("normalizes UUID casing and preserves the administrator's image order", async () => {
    const normalized = orderSchema.parse({
      ...input(),
      items: [{ productId: productId.toUpperCase(), quantity: 1 }],
    });
    expect(normalized.items[0].productId).toBe(productId);
    const listed = await listProducts(productFilters.parse({}));
    expect(listed.items[0].images.map((i) => i.imageUrl)).toEqual([
      "https://example.com/car.jpg",
      "https://example.com/car2.jpg",
    ]);
  });
  it("calculates decimal money without floating point rounding", () => {
    expect(fromCents(toCents("0.10") * 3n)).toBe("0.30");
    expect(() => toCents("1.001")).toThrow();
    expect(() => fromCents(BigInt(Number.MAX_SAFE_INTEGER) + 1n)).toThrow();
  });
});
describe("admin authentication and protection", () => {
  async function seedAdmin() {
    const password = "secure-test-password";
    const passwordHash = await hashPassword(password);
    await db().insert(schema.users).values({
      name: "Admin",
      email: "admin@example.com",
      passwordHash,
      role: "ADMIN",
    });
    return { password, passwordHash };
  }
  it("hashes passwords, creates secure sessions and never returns password hashes", async () => {
    const { password, passwordHash } = await seedAdmin();
    expect(passwordHash).not.toContain(password);
    expect(await verifyPassword("incorrect", passwordHash)).toBe(false);
    const user = await login("admin@example.com", password);
    expect(user).not.toHaveProperty("passwordHash");
    expect(holder.options[0]).toMatchObject({
      httpOnly: true,
      sameSite: "strict",
      path: "/",
    });
    expect(await requireAdmin(request("/api/admin/orders"))).toMatchObject({
      email: "admin@example.com",
    });
    const session = (await db().select().from(schema.adminSessions))[0];
    expect(session.tokenHash).not.toBe(holder.cookies.get("vp-admin"));
    await logout();
    await expect(requireAdmin()).rejects.toMatchObject({ status: 401 });
  });
  it("rejects bad credentials and expired sessions", async () => {
    const { password } = await seedAdmin();
    await expect(login("admin@example.com", "wrong")).rejects.toMatchObject({
      status: 401,
    });
    await expect(login("missing@example.com", "wrong")).rejects.toMatchObject({
      status: 401,
    });
    await login("admin@example.com", password);
    await db()
      .update(schema.adminSessions)
      .set({ expiresAt: new Date(Date.now() - 1000) });
    await expect(requireAdmin()).rejects.toMatchObject({ status: 401 });
  });
  it("enforces mutation origins and database-backed rate limits", async () => {
    const { password } = await seedAdmin();
    await login("admin@example.com", password);
    await expect(
      requireAdmin(
        request(
          "/api/admin/products",
          "POST",
          {},
          { Origin: "https://evil.example" },
        ),
      ),
    ).rejects.toMatchObject({ status: 403 });
    const response = await loginPost(
      new Request("http://localhost:3000/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@example.com", password }),
      }),
      context,
    );
    expect(response.status).toBe(403);
    await consumeRateLimit("test-limit", 1, 60);
    await expect(consumeRateLimit("test-limit", 1, 60)).rejects.toMatchObject({
      status: 429,
    });
  });
  it("allows authenticated catalog mutations and returns safe order details", async () => {
    const { password } = await seedAdmin();
    await login("admin@example.com", password);
    const categoryRoute = await import("@/app/api/admin/categories/route");
    const categoryResponse = await categoryRoute.POST(
      request("/api/admin/categories", "POST", {
        name: "Accessories",
        slug: "accessories",
        imageUrl: "https://example.com/accessories.jpg",
      }),
      context,
    );
    expect(categoryResponse.status).toBe(201);
    const category = (await categoryResponse.json()).data;
    const productRoute = await import("@/app/api/admin/products/route");
    const productResponse = await productRoute.POST(
      request("/api/admin/products", "POST", {
        name: "New Accessory",
        slug: "new-accessory",
        description: "An accessory",
        price: "20.10",
        quantity: 3,
        condition: "New",
        categoryId: category.id,
        images: ["https://example.com/a.jpg"],
      }),
      context,
    );
    expect(productResponse.status).toBe(201);
    const product = (await productResponse.json()).data;
    const mutationRoute = await import("@/app/api/admin/products/[id]/route");
    const updated = await mutationRoute.PATCH(
      request("/api/admin/products/item", "PATCH", {
        price: "30.10",
        quantity: 8,
      }),
      { params: Promise.resolve({ id: product.id }) },
    );
    expect(updated.status).toBe(200);
    expect((await updated.json()).data.status).toBe("IN_STOCK");
    const { order } = await createOrder(input(), randomUUID());
    const statusRoute =
      await import("@/app/api/admin/orders/[id]/status/route");
    expect(
      (
        await statusRoute.PATCH(
          request("/api/admin/orders/item/status", "PATCH", {
            status: "CONFIRMED",
          }),
          { params: Promise.resolve({ id: order.id }) },
        )
      ).status,
    ).toBe(200);
    const orderRoute = await import("@/app/api/admin/orders/[id]/route");
    const details = await orderRoute.GET(request("/api/admin/orders/item"), {
      params: Promise.resolve({ id: order.id }),
    });
    expect((await details.json()).data.items[0].unitPrice).toBe("100.25");
    expect(
      (
        await mutationRoute.DELETE(
          request("/api/admin/products/item", "DELETE"),
          { params: Promise.resolve({ id: product.id }) },
        )
      ).status,
    ).toBe(200);
  });
  it("requires an authenticated, same-origin admin before signing direct media uploads", async () => {
    const { authorizeMediaUpload } = await import("@/lib/upload-router");
    await expect(
      authorizeMediaUpload(request("/api/uploadthing", "POST")),
    ).rejects.toThrow("Admin login required");
    const { password } = await seedAdmin();
    await login("admin@example.com", password);
    expect(
      await authorizeMediaUpload(request("/api/uploadthing", "POST")),
    ).toHaveProperty("adminId");
    await expect(
      authorizeMediaUpload(
        request("/api/uploadthing", "POST", undefined, {
          Origin: "https://evil.example",
        }),
      ),
    ).rejects.toThrow("Request origin is not allowed");
  });
  it("protects every admin catalog, order and upload endpoint before processing input", async () => {
    const endpoints = [
      ["@/app/api/admin/categories/route", "POST"],
      ["@/app/api/admin/categories/route", "GET"],
      ["@/app/api/admin/categories/[id]/route", "PATCH"],
      ["@/app/api/admin/categories/[id]/route", "DELETE"],
      ["@/app/api/admin/products/route", "POST"],
      ["@/app/api/admin/products/route", "GET"],
      ["@/app/api/admin/products/[id]/route", "PATCH"],
      ["@/app/api/admin/products/[id]/route", "DELETE"],
      ["@/app/api/admin/orders/route", "GET"],
      ["@/app/api/admin/orders/[id]/route", "GET"],
      ["@/app/api/admin/orders/[id]/status/route", "PATCH"],
      ["@/app/api/admin/uploads/route", "POST"],
      ["@/app/api/admin/auth/me/route", "GET"],
      ["@/app/api/admin/auth/logout/route", "POST"],
    ];
    for (const [path, method] of endpoints) {
      const route = await import(path);
      const response = await route[method](request("/api/admin/test", method), {
        params: Promise.resolve({ id: productId }),
      });
      expect(response.status, `${method} ${path}`).toBe(401);
    }
  });
});
