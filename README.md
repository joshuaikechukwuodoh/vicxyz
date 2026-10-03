# VICTOR PEDRO Commerce Frontend

Premium vehicle/motor-parts storefront built with Next.js, TypeScript and Zustand.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## What is included

- Premium responsive homepage
- Shop page
- Dynamic category pages using slugs
- Dynamic product pages using slugs
- Zustand cart with localStorage persistence
- WhatsApp checkout message generation
- About and contact pages
- Static mock product data

## Important

This is frontend only. There is no database or admin backend yet.

Before real use, replace the WhatsApp number in:

`lib/config.ts`

with the business WhatsApp number in international format without `+`.

Example: `2348012345678`
