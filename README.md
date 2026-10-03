# VICTOR PEDRO — catalog and WhatsApp orders

An admin-managed catalog for cars, motorcycles, motor parts and accessories. The existing milk-cream storefront and personal branding are preserved. Catalog pages load the public APIs; the cart saves an order before opening WhatsApp. There is no payment gateway.

## Stack

Next.js App Router Route Handlers, TypeScript, PostgreSQL, Drizzle ORM, Zod and Cloudinary. Admin authentication uses scrypt password hashes and revocable, opaque database sessions.

## Local setup

Requires Node.js 22+ and PostgreSQL 15+ (or Docker Desktop).

```powershell
npm install
Copy-Item .env.example .env
```

Set these values in `.env`:

| Variable                                                               | Purpose                                                                                       |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                         | PostgreSQL connection URL. Use the provider's TLS requirements for a hosted database.         |
| `APP_URL`                                                              | Exact browser origin, e.g. `http://localhost:3000`. Use your HTTPS site origin in production. |
| `AUTH_SECRET`                                                          | Random secret of at least 32 characters used to hash session tokens.                          |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`                          | Initial admin for the seed script. Password must have 12–256 characters.                      |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Server-side image upload credentials.                                                         |

Generate the auth secret locally:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

If using the included local PostgreSQL container:

```powershell
docker compose up -d
```

Then initialize and run:

```powershell
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. The seed creates Cars, Motorcycles, Motor Parts and Accessories, six sample products with images, and the admin. It preserves existing records and does not reset existing passwords or products. Review sample inventory and prices before making the store public. Remove `ADMIN_PASSWORD` from deployment settings after seeding.

The backend does not silently fall back to mock data when the database is unavailable. The storefront shows a recoverable loading error. Existing legacy carts are cleared once because products now use database UUIDs.

## Major files

| Path                                                  | Responsibility                                                                                         |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `db/schema/index.ts`                                  | Tables, enums, foreign keys, indexes and database constraints.                                         |
| `db/migrations/`                                      | Versioned SQL migrations and Drizzle metadata.                                                         |
| `db/index.ts`                                         | Lazy PostgreSQL connection; no database is required at build time.                                     |
| `db/migrate.ts`, `db/seed.ts`                         | Migration runner and repeatable seed.                                                                  |
| `repositories/catalog.ts`                             | Catalog reads, multiple images, filtering and pagination.                                              |
| `services/catalog.ts`                                 | Transactional catalog writes and safe deletion.                                                        |
| `services/orders.ts`                                  | Authoritative prices, saved snapshots, daily references, retries, stock confirmation and cancellation. |
| `services/uploads.ts`                                 | Bounded multi-image uploads to Cloudinary.                                                             |
| `validators/index.ts`                                 | Strict Zod request and query validation.                                                               |
| `lib/auth.ts`, `lib/password.ts`                      | Admin sessions and scrypt password hashing.                                                            |
| `lib/api.ts`, `lib/rate-limit.ts`                     | Consistent safe errors, body limits, origin checks and database-backed throttling.                     |
| `lib/money.ts`                                        | Exact calculations in integer kobo; API money values are decimal strings.                              |
| `types/api.ts`                                        | Shared response and status types.                                                                      |
| `app/api/`                                            | Thin public/admin Route Handlers.                                                                      |
| `components/CheckoutForm.tsx`                         | Customer details, saving checkout, retry protection and WhatsApp handoff.                              |
| `lib/catalog-client.ts`, `components/CatalogGrid.tsx` | Existing storefront's API integration.                                                                 |
| `tests/backend.test.ts`                               | Database-backed backend integration and security tests.                                                |

## API conventions

Successful responses: `{ "data": ... }`. Failures: `{ "error": { "message": "...", "issues": [...] } }` (`issues` only for validation). JSON mutations require `Content-Type: application/json`. Unknown body/query fields are rejected. Prices and totals are decimal strings in naira. Quantities are integers. Resource IDs are UUIDs.

Errors: 400 malformed request, 401 login required/bad credentials, 403 invalid origin, 404 missing resource, 409 stock/transition/duplicate conflict, 413 oversized request, 415 content type, 422 validation, 429 throttling, 500 safe internal error, 502 upload failure, 503 image storage unconfigured.

## Public APIs

| Method | Path                     | Behavior                                                               |
| ------ | ------------------------ | ---------------------------------------------------------------------- |
| GET    | `/api/categories`        | Category list.                                                         |
| GET    | `/api/categories/[slug]` | Single category; 404 if missing.                                       |
| GET    | `/api/products`          | `{ items, pagination }`. Filters below.                                |
| GET    | `/api/products/[slug]`   | Product with category and all images; 404 if missing.                  |
| POST   | `/api/orders`            | Saves order/items and returns `{ order, whatsapp: { url, message } }`. |

Product filters: `category` (category slug), `search` (name/description), `status` (`IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`), `minPrice`, `maxPrice`, `page`, `limit` (1–100; default 24).

Example: `/api/products?category=cars&search=Toyota&status=IN_STOCK&minPrice=1000000&maxPrice=50000000&page=1&limit=24`.

Order body:

```json
{
  "customerName": "Customer Name",
  "customerPhone": "08012345678",
  "customerEmail": "customer@example.com",
  "items": [{ "productId": "UUID_FROM_PRODUCTS_API", "quantity": 1 }]
}
```

Omit `customerEmail` when unused. Send a UUID in the `Idempotency-Key` header and reuse it for retries of the same order. Reusing a key with changed customer/items returns 409. If omitted, the server generates a key, so independent retries will create independent orders. The existing cart sends and retains a key per checkout payload.

The server validates products and available stock, reads current prices, calculates exact subtotals and total, and saves the order and all items in one transaction. It stores product name/unit price snapshots. References use `MOT-YYYYMMDD-0001`, based on the Lagos calendar date and an atomic database counter. Checkout never reserves or permanently reduces stock. WhatsApp links use the configured business number `2348158124025`; customers still tap Send in WhatsApp.

## Admin authentication

No public registration or hardcoded password. Seed the first admin. All admin catalog, upload and order endpoints require a current admin session. Only login is anonymous.

| Method | Path                     | Body/result                                                                                |
| ------ | ------------------------ | ------------------------------------------------------------------------------------------ |
| POST   | `/api/admin/auth/login`  | `{ "email": "...", "password": "..." }`; sets session cookie and returns safe user fields. |
| GET    | `/api/admin/auth/me`     | Current safe admin fields.                                                                 |
| POST   | `/api/admin/auth/logout` | Revokes session and removes cookie.                                                        |

Cookies are HttpOnly, SameSite=Strict and Secure in production, expire after 8 hours, and use a `__Host-` prefix in production. Only HMAC hashes of random 256-bit session tokens are stored. Password hashes never appear in API responses. Login is limited per email and globally, with generic credential errors.

Browser requests use same-origin cookies. Every admin mutation, including login/logout/uploads, must send an `Origin` header matching `APP_URL`. This is checked before processing input. REST clients must also send it and retain the login cookie. Serve production over HTTPS; use a separate database user with only the required privileges.

For example, using curl (on Windows, use `curl.exe`):

```bash
curl -c admin-cookies.txt -H 'Origin: http://localhost:3000' \
  -H 'Content-Type: application/json' \
  -d '{"email":"YOUR_ADMIN_EMAIL","password":"YOUR_ADMIN_PASSWORD"}' \
  http://localhost:3000/api/admin/auth/login

curl -b admin-cookies.txt http://localhost:3000/api/admin/orders
```

Treat cookie files as secrets and delete them after use. This task implements the admin API, not a new admin dashboard.

## Admin catalog APIs

| Method        | Path                         |
| ------------- | ---------------------------- |
| GET, POST     | `/api/admin/categories`      |
| PATCH, DELETE | `/api/admin/categories/[id]` |
| GET, POST     | `/api/admin/products`        |
| PATCH, DELETE | `/api/admin/products/[id]`   |
| POST          | `/api/admin/uploads`         |

Create category body:

```json
{
  "name": "Cars",
  "slug": "cars",
  "imageUrl": "https://res.cloudinary.com/YOUR_CLOUD/image/upload/...jpg"
}
```

Create product body:

```json
{
  "name": "Toyota Camry",
  "slug": "toyota-camry",
  "description": "Vehicle specifications and condition details.",
  "price": "28500000.00",
  "quantity": 2,
  "condition": "Foreign Used",
  "status": "LOW_STOCK",
  "categoryId": "UUID_FROM_CATEGORIES_API",
  "images": ["https://res.cloudinary.com/YOUR_CLOUD/image/upload/...jpg"]
}
```

PATCH accepts any nonempty subset of the create fields. `images` replaces the complete image list; omission preserves images. Image order is preserved, and the first image is the product cover. Changing quantity derives status unless explicitly provided: zero means OUT_OF_STOCK, 1–5 means LOW_STOCK, 6+ means IN_STOCK. Admins may mark positive inventory OUT_OF_STOCK to temporarily stop checkout. Zero stock cannot have an available status. Product prices support up to 12 whole digits and two decimals; exceptionally large order totals are rejected.

Delete categories only after moving/deleting their products (409 while in use). Product deletion preserves order history via snapshots and nullable product references. Products in active CONFIRMED orders cannot be deleted until those orders are completed or cancelled.

### Cloudinary upload

Authenticate, then POST multipart form data with repeated `files` fields to `/api/admin/uploads`. Accepts 1–12 JPEG/PNG/WebP images, each up to 8 MB and total up to 32 MB. Checks file signatures and limits the streamed body. Returns a list of `{ imageUrl, publicId }`; use `imageUrl` values in category/product writes. Credentials remain server-side. Uploads go to `victor-pedro/products`. Failed batches attempt to remove successful uploads from that batch.

```bash
curl -b admin-cookies.txt -H 'Origin: http://localhost:3000' \
  -F 'files=@front.jpg' -F 'files=@interior.jpg' \
  http://localhost:3000/api/admin/uploads
```

Uploading and attaching images are separate requests. Unattached or replaced assets are retained in Cloudinary; remove unused assets through the Cloudinary console. Video storage is outside this backend's requested image model.

## Admin orders and stock

| Method | Path                            | Behavior                                                 |
| ------ | ------------------------------- | -------------------------------------------------------- |
| GET    | `/api/admin/orders`             | Paginated orders; optional `status`, `page`, `limit`.    |
| GET    | `/api/admin/orders/[id]`        | Customer information and immutable order-item snapshots. |
| PATCH  | `/api/admin/orders/[id]/status` | `{ "status": "CONFIRMED" }` (or other allowed status).   |

Allowed transitions:

- PENDING → CONTACTED, CONFIRMED or CANCELLED.
- CONTACTED → CONFIRMED or CANCELLED.
- CONFIRMED → COMPLETED or CANCELLED.
- CANCELLED and COMPLETED are terminal.
- Repeating the current status is an idempotent no-op.

Confirmation locks the order and its product rows, rechecks availability, reduces every product quantity in one transaction, and updates stock statuses. Insufficient stock rolls back the entire confirmation. Concurrent confirmations cannot reduce stock below zero or deduct twice. A pending/contacted cancellation does not change stock. Cancelling a confirmed order restores stock exactly once; completion keeps the deduction. Orders do not automatically become CONTACTED just because WhatsApp opened.

## Verification

```powershell
npm run test:backend
npm run typecheck
npm run build
npm audit
```

Tests apply the actual SQL migrations to PGlite (an embedded PostgreSQL engine) and exercise pricing snapshots, references, retries, concurrent confirmations, rollback, cancellation, filtering, constraints, session expiry, origin checks, throttling and protection on all admin endpoints. They need no live credentials and make no real Cloudinary uploads. PGlite serializes connection access; its concurrency tests do not replace production PostgreSQL load testing. A hosted PostgreSQL connection and real Cloudinary uploads must still be verified after configuring credentials.

After schema changes, run `npm run db:generate`, review the SQL, and apply `npm run db:migrate`. Deploy migrations before deploying code that requires them. Production needs a persistent PostgreSQL database, Cloudinary credentials, `APP_URL`, `AUTH_SECRET`, backups, and an ingress/request-size limit. The included Compose credentials are for local development only.
