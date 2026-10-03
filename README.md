# VICTOR PEDRO — catalog and WhatsApp orders

An admin-managed catalog for cars, motorcycles, auto parts and accessories, with a cream storefront, an automotive brand icon, a close portrait and a car photo showcase. Catalog pages load the public APIs; the cart saves an order before opening WhatsApp. There is no payment gateway.

## Stack

Next.js App Router Route Handlers, TypeScript, PostgreSQL, Drizzle ORM, Zod and UploadThing. Admin authentication uses scrypt password hashes and revocable, opaque database sessions.

## Local setup

Requires Node.js 22+ and PostgreSQL 15+ (or Docker Desktop).

```powershell
npm install
Copy-Item .env.example .env
```

Set these values in `.env`:

| Variable                                      | Purpose                                                                                       |
| --------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                | PostgreSQL connection URL. Use the provider's TLS requirements for a hosted database.         |
| `APP_URL`                                     | Exact browser origin, e.g. `http://localhost:3000`. Use your HTTPS site origin in production. |
| `AUTH_SECRET`                                 | Random secret of at least 32 characters used to hash session tokens.                          |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Initial admin for the seed script. Password must have 12–256 characters.                      |
| `UPLOADTHING_TOKEN`                           | Server-side image upload credentials.                                                         |

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

Open `http://localhost:3000`. The seed creates Cars, Motorcycles, Auto Parts and Accessories and the admin. It adds no demo products. It preserves existing records and does not reset existing passwords or products. Upload your own inventory through `/admin`. Remove `ADMIN_PASSWORD` from deployment settings after seeding.

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
| `services/uploads.ts`                                 | Bounded multi-image uploads to UploadThing.                                                            |
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

The server validates products and available stock, reads current prices, calculates exact subtotals and total, and saves the order and all items in one transaction. It stores product name/unit price snapshots. References use `MOT-YYYYMMDD-0001`, based on the Lagos calendar date and an atomic database counter. Checkout never reserves or permanently reduces stock. WhatsApp links use the configured business number `2348084549079`; customers still tap Send in WhatsApp.

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

Treat cookie files as secrets and delete them after use. Open `/admin` to sign in, upload photos, create or edit products and categories, and update order statuses.

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
  "imageUrl": "https://YOUR_APP.ufs.sh/f/FILE_KEY"
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
  "images": ["https://YOUR_APP.ufs.sh/f/FILE_KEY"]
}
```

PATCH accepts any nonempty subset of the create fields. `images` replaces the complete image list; omission preserves images. Image order is preserved, and the first image is the product cover. Changing quantity derives status unless explicitly provided: zero means OUT_OF_STOCK, 1–5 means LOW_STOCK, 6+ means IN_STOCK. Admins may mark positive inventory OUT_OF_STOCK to temporarily stop checkout. Zero stock cannot have an available status. Product prices support up to 12 whole digits and two decimals; exceptionally large order totals are rejected.

Delete categories only after moving/deleting their products (409 while in use). Product deletion preserves order history via snapshots and nullable product references. Products in active CONFIRMED orders cannot be deleted until those orders are completed or cancelled.

### UploadThing upload

Authenticate, then POST multipart form data with repeated `files` fields to `/api/admin/uploads`. Accepts 1–12 JPEG/PNG/WebP images, each up to 8 MB and total up to 32 MB. Checks file signatures and limits the streamed body. Returns a list of `{ imageUrl, publicId }` (`publicId` is the UploadThing file key, retained for API compatibility); use `imageUrl` values in category/product writes. Credentials remain server-side. Set the server-only `UPLOADTHING_TOKEN` from the UploadThing dashboard and configure public file access for catalog photos. Failed batches attempt to remove successful uploads from that batch.

```bash
curl -b admin-cookies.txt -H 'Origin: http://localhost:3000' \
  -F 'files=@front.jpg' -F 'files=@interior.jpg' \
  http://localhost:3000/api/admin/uploads
```

Uploading and attaching images are separate requests. Unattached or replaced assets are retained in UploadThing; remove unused assets through the UploadThing console. Product videos are supported by the direct-upload dashboard described below.

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

Tests apply the actual SQL migrations to PGlite (an embedded PostgreSQL engine) and exercise pricing snapshots, references, retries, concurrent confirmations, rollback, cancellation, filtering, constraints, session expiry, origin checks, throttling and protection on all admin endpoints. They need no live credentials and make no real UploadThing uploads. PGlite serializes connection access; its concurrency tests do not replace production PostgreSQL load testing. A hosted PostgreSQL connection and real UploadThing uploads must still be verified after configuring credentials.

After schema changes, run `npm run db:generate`, review the SQL, and apply `npm run db:migrate`. Deploy migrations before deploying code that requires them. Production needs a persistent PostgreSQL database, UploadThing credentials, `APP_URL`, `AUTH_SECRET`, backups, and an ingress/request-size limit. The included Compose credentials are for local development only.

## Admin dashboard

Open `/admin` and sign in with the seeded administrator. Upload product/category photos and product videos, review previews, choose the cover image, then save to publish. Product and category forms support editing and deletion; orders expose only allowed status transitions. Uploads and saves show errors and prevent duplicate clicks while processing. Product inventory status is derived from quantity on save.

The server-side UploadThing integration follows the [official UTApi documentation](https://docs.uploadthing.com/api-reference/ut-api). Configure public file access in your UploadThing app; the token stays on the server. The optional server-side image endpoint requires multipart requests up to 34 MB; the dashboard uses direct uploads instead. The Effect dependency is overridden to a patched 3.20+ release; rerun backend tests and the build when upgrading UploadThing.

## Your real photos and videos

Sign in at `/admin`, add a product name, description, price, quantity and category, then use **Upload product photos** and **Upload product videos**. At least one product photo is required. Choose up to 12 JPEG/PNG/WebP photos (8 MB each) and up to 3 MP4/WebM videos (64 MB each). Review the previews and click **Publish product**. Uploading files alone does not publish a listing. Existing listings can be edited, media removed, or a different cover photo chosen.

Dashboard uploads use UploadThing's authenticated direct-upload router at `/api/uploadthing`, so the media bytes go from the browser directly to storage. `/api/admin/uploads` remains available for the original image-only server-side API. Admin authorization runs before signing any direct upload; UploadThing verifies its completion callbacks. The server-only `UPLOADTHING_TOKEN` is required. Set public file access for customer media. Video playback depends on the browser supporting the video's codec; MP4 with H.264 is the most broadly compatible option.

Product APIs now return a `videos` array alongside `images`. Create/PATCH accepts an optional `videos` array of up to three HTTPS URLs. `videos: []` removes all videos; omitting it preserves existing videos. `db/migrations/0002_product_videos.sql` creates the product-video table.

For an existing database:

```powershell
npm run db:migrate
npm run db:seed
npm run db:clear-demo
```

Demo cleanup targets only the six original sample slugs still using Unsplash photos. It skips products in active confirmed orders, preserves order-item snapshots, and replaces original category stock photos with neutral category artwork. Real uploads are preserved. New seeds no longer add sample products. The stock car-photo showcase was removed from the homepage; your personal photos remain.

## Purchased domain

The site identity is **Victor Pedro Automobile** and metadata uses **https://victorpedroautomobile.com**. Add `victorpedroautomobile.com` to the website's hosting dashboard, then set the DNS records supplied by that host in your domain registrar. Wait for the host to verify the domain and issue HTTPS. Set the deployed `APP_URL=https://victorpedroautomobile.com` and redeploy; keep `APP_URL=http://localhost:3000` for local development. Admin login and uploads enforce this origin. A source-code name change does not itself configure DNS or hosting. If `www` is used, redirect it to the canonical domain rather than serving admin on two origins.
