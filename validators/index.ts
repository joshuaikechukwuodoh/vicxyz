import { z } from "zod";
export const idSchema = z.uuid().transform((s) => s.toLowerCase());
export const statusSchema = z.enum(["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"]);
export const orderStatusSchema = z.enum([
  "PENDING",
  "CONTACTED",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
]);
const slug = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const imageUrl = z
  .url()
  .max(2048)
  .refine((s) => new URL(s).protocol === "https:", "Images must use HTTPS");
const price = z
  .union([
    z.string().regex(/^\d{1,12}(\.\d{1,2})?$/),
    z
      .number()
      .min(0)
      .max(999999999999.99)
      .refine(
        (n) => /^\d+(\.\d{1,2})?$/.test(String(n)),
        "At most two decimal places",
      ),
  ])
  .transform(String);
export const categorySchema = z
  .object({ name: z.string().trim().min(2).max(120), slug, imageUrl })
  .strict();
export const categoryPatch = categorySchema
  .partial()
  .refine((x) => Object.keys(x).length > 0, "Provide fields to update");
export const productSchema = z
  .object({
    name: z.string().trim().min(2).max(180),
    slug,
    description: z.string().trim().min(1).max(10000),
    price,
    quantity: z.number().int().min(0).max(1000000),
    condition: z.string().trim().min(1).max(100),
    status: statusSchema.optional(),
    categoryId: idSchema,
    images: z.array(imageUrl).min(1).max(12),
  })
  .strict();
export const productPatch = productSchema
  .partial()
  .refine((x) => Object.keys(x).length > 0, "Provide fields to update");
const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{7,24}$/, "Enter a valid phone number")
  .transform((s) => s.replace(/[ ()-]/g, ""))
  .refine(
    (s) =>
      s.replace(/\D/g, "").length >= 7 && s.replace(/\D/g, "").length <= 15,
    "Enter a valid phone number",
  );
export const orderSchema = z
  .object({
    customerName: z.string().trim().min(2).max(120),
    customerPhone: phone,
    customerEmail: z.email().max(254).optional(),
    items: z
      .array(
        z
          .object({
            productId: idSchema,
            quantity: z.number().int().min(1).max(10000),
          })
          .strict(),
      )
      .min(1)
      .max(50),
  })
  .strict()
  .refine(
    (x) => new Set(x.items.map((i) => i.productId)).size === x.items.length,
    "Products must not be repeated",
  );
export const loginSchema = z
  .object({
    email: z
      .email()
      .max(254)
      .transform((s) => s.toLowerCase()),
    password: z.string().min(1).max(256),
  })
  .strict();
export const statusBody = z.object({ status: orderStatusSchema }).strict();
const integerParam = (max: number, fallback: number) =>
  z.coerce.number().int().min(1).max(max).default(fallback);
export const productFilters = z
  .object({
    category: z.string().max(160).optional(),
    search: z.string().trim().max(120).optional(),
    status: statusSchema.optional(),
    minPrice: price.optional(),
    maxPrice: price.optional(),
    page: integerParam(1000000, 1),
    limit: integerParam(100, 24),
  })
  .strict()
  .refine(
    (x) =>
      x.minPrice === undefined ||
      x.maxPrice === undefined ||
      Number(x.minPrice) <= Number(x.maxPrice),
    "minPrice cannot exceed maxPrice",
  );
export const orderFilters = z
  .object({
    status: orderStatusSchema.optional(),
    page: integerParam(1000000, 1),
    limit: integerParam(100, 24),
  })
  .strict();
export type CreateOrder = z.infer<typeof orderSchema>;
export type ProductInput = z.infer<typeof productSchema>;
