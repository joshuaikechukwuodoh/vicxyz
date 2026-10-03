import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  boolean,
  date,
  check,
  index,
} from "drizzle-orm/pg-core";

export const roles = pgEnum("user_role", ["ADMIN"]);
export const productStatuses = pgEnum("product_status", [
  "IN_STOCK",
  "LOW_STOCK",
  "OUT_OF_STOCK",
]);
export const orderStatuses = pgEnum("order_status", [
  "PENDING",
  "CONTACTED",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
]);
const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roles("role").default("ADMIN").notNull(),
  ...timestamps(),
});
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  imageUrl: text("image_url").notNull(),
  ...timestamps(),
});
export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull(),
    price: numeric("price", { precision: 18, scale: 2 }).notNull(),
    quantity: integer("quantity").notNull(),
    condition: text("condition").notNull(),
    status: productStatuses("status").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    ...timestamps(),
  },
  (t) => [
    check("product_quantity_nonnegative", sql`${t.quantity} >= 0`),
    check("product_price_nonnegative", sql`${t.price} >= 0`),
    check(
      "product_stock_status_valid",
      sql`(${t.quantity} = 0 AND ${t.status} = 'OUT_OF_STOCK') OR ${t.quantity} > 0`,
    ),
    index("product_category_idx").on(t.categoryId),
    index("product_status_idx").on(t.status),
  ],
);
export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    position: integer("position").default(0).notNull(),
    imageUrl: text("image_url").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("product_images_product_idx").on(t.productId)],
);
export const productVideos = pgTable(
  "product_videos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    position: integer("position").default(0).notNull(),
    videoUrl: text("video_url").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("product_videos_product_idx").on(t.productId)],
);
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reference: text("reference").notNull().unique(),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    customerEmail: text("customer_email"),
    status: orderStatuses("status").default("PENDING").notNull(),
    totalAmount: numeric("total_amount", { precision: 18, scale: 2 }).notNull(),
    stockReduced: boolean("stock_reduced").default(false).notNull(),
    idempotencyKey: uuid("idempotency_key").notNull().unique(),
    requestHash: text("request_hash").notNull(),
    ...timestamps(),
  },
  (t) => [
    check("order_total_nonnegative", sql`${t.totalAmount} >= 0`),
    index("orders_status_created_idx").on(t.status, t.createdAt),
  ],
);
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    productName: text("product_name").notNull(),
    unitPrice: numeric("unit_price", { precision: 18, scale: 2 }).notNull(),
    quantity: integer("quantity").notNull(),
    subtotal: numeric("subtotal", { precision: 18, scale: 2 }).notNull(),
  },
  (t) => [
    check("order_item_quantity_positive", sql`${t.quantity} > 0`),
    check(
      "order_item_amount_valid",
      sql`${t.unitPrice} >= 0 AND ${t.subtotal} = ${t.unitPrice} * ${t.quantity}`,
    ),
    index("order_items_order_idx").on(t.orderId),
    index("order_items_product_idx").on(t.productId),
  ],
);
export const orderCounters = pgTable("order_counters", {
  day: date("day").primaryKey(),
  value: integer("value").notNull(),
});
export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tokenHash: text("token_hash").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("admin_sessions_expiry_idx").on(t.expiresAt)],
);
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
