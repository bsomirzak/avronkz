# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # next dev (http://localhost:3000)
npm run build    # next build — also validates generateStaticParams() for /products/[id]
npm run start    # serve built output
npm run lint     # eslint (flat config, eslint-config-next + typescript rules)
```

No test framework is configured.

## Stack notes that bite

- **Next.js 16.2.6 + React 19.2.4, App Router only.** `searchParams` and `params` in page/layout/metadata functions are `Promise<...>` — you must `await` them (see [app/page.tsx](app/page.tsx#L11-L46) and [app/products/[id]/page.tsx](app/products/%5Bid%5D/page.tsx)). AGENTS.md warns to consult `node_modules/next/dist/docs/` before writing Next code — that warning is real, not boilerplate.
- **Tailwind v4 via `@tailwindcss/postcss`**, not v3. There is no `tailwind.config.{js,ts}` — config lives in CSS. In practice the app uses **hand-written CSS in [app/globals.css](app/globals.css)** with CSS custom properties (`--navy`, `--ink`, etc.); Tailwind utilities are barely used. Match that style — extend `globals.css` rather than introducing utility-class soup.
- **TypeScript strict, path alias `@/*` → repo root** (see [tsconfig.json](tsconfig.json#L21-L24)). Import as `@/lib/products`, `@/components/Header`.

## Architecture

Russian-language storefront for AVRON (Almaty, KZ). No cart/checkout — purely a catalog with strong SEO. KZT currency, `lang="ru"`, Manrope font with Cyrillic subset.

### Single source of truth: [lib/products.ts](lib/products.ts)

`PRODUCTS` and `CATEGORIES` arrays are hardcoded TypeScript constants. Everything downstream derives from them:
- The homepage grid ([app/page.tsx](app/page.tsx)) via `productsByCategory(catKey)`.
- The product detail pages ([app/products/[id]/page.tsx](app/products/%5Bid%5D/page.tsx)) via `generateStaticParams()` → one static page per product id.
- The sitemap ([app/sitemap.ts](app/sitemap.ts)) and JSON-LD ([lib/seo.ts](lib/seo.ts)).
- The icon shown on each card — `Product.icon` is an `IconName` literal that must match a branch in [components/ProductIcon.tsx](components/ProductIcon.tsx) (inline SVG, no image files). Adding a product with a new icon name requires adding both the `IconName` union member and the SVG case.

Adding/removing a product or category propagates automatically to the grid, routes, sitemap, and structured data — but you must rebuild for the static product pages to update.

Note: [app/data/](app/data/) contains raw product photos (Monitor, E-Book, …) that are **not currently wired into the app**. The catalog renders SVG icons via `ProductIcon`, not these assets.

### Site config & SEO

- [lib/site.ts](lib/site.ts) — canonical site metadata (name, URL, city, phone, social). `SITE.url` falls back to `https://avron.kz` but can be overridden with `NEXT_PUBLIC_SITE_URL` for previews.
- [lib/seo.ts](lib/seo.ts) — JSON-LD builders (`organizationJsonLd`, `websiteJsonLd`, `productJsonLd`, `breadcrumbJsonLd`). `jsonLdScript()` escapes `<` to prevent script-tag injection — always use it when emitting JSON-LD via `dangerouslySetInnerHTML`.
- Organization + WebSite JSON-LD are injected once in [app/layout.tsx](app/layout.tsx); Product + BreadcrumbList are injected per product page.
- `app/page.tsx` rewrites the canonical URL per `?cat=` filter — preserve that behavior when touching homepage metadata.

### Server vs client components

Server by default. Only three client components, all marked with `"use client"`: [components/FavButton.tsx](components/FavButton.tsx), [components/Gallery.tsx](components/Gallery.tsx), [components/ProductTabs.tsx](components/ProductTabs.tsx). Keep new interactivity contained to small leaf components — don't promote parents to client unnecessarily.

### Localization & formatting

All user-facing copy is Russian. Prices use `formatPrice()` from [lib/products.ts](lib/products.ts) (ru-RU locale, `₸` suffix, narrow-space separators). Pluralization uses `countLabel()` for Russian "товар / товара / товаров" forms — reuse it, don't reinvent.
