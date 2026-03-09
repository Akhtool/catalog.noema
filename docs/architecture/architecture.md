# Architecture

## Purpose

This document describes the current architecture of `catalog.noema` as it exists now.
It is intentionally practical: it records the real boundaries in the codebase, not an idealized target design.

## Core domain

The product is a per-business catalog with:

- business profile and branding;
- categories, brands, products, and product images;
- a public catalog on business subdomains like `{slug}.catlg.ru/`;
- a client-side cart and virtual order;
- owner/admin overlay flows for editing catalog data on the same catalog route;
- internal onboarding that the platform team uses to create a business and its initial owner account.

## Data model split

### Stored in Supabase

- `business`
- `business_user`
- `profile`
- `category`
- `brand`
- `product`
- `product_image`
- `business_location`

Supabase is the system of record for catalog data, admin data, and access links between users and businesses.

### Not stored in Supabase

- cart state
- checkout session state
- virtual order object

Cart and checkout are client-side only. The order is assembled in memory and used to generate a contact message and deep link.

## Runtime layers

### `app/`

This is the route and server boundary layer.

- `app/[slug]/page.tsx`
  - loads business, categories, locations, and products;
  - checks whether the current user is owner/admin for the current business;
  - maps DB rows into app types;
  - renders the public catalog shell.
- `app/admin/*`
  - protected admin routes and server actions;
  - write operations for business, category, brand, and product entities;
  - cache invalidation via `revalidatePath`.
- `app/login`
  - sign-in entry that is valid only on a business subdomain like `{slug}.catlg.ru/login`.
- `app/signup`, `app/onboarding`
  - internal-only team flows, not public business self-service entry points.
- `app/api/*`
  - thin route handlers for scheduled/background or auth-related flows.

Rule:
- route files should orchestrate requests, permissions, redirects, and rendering;
- route files should not become the home of reusable business rules.

### `components/`

This is the UI layer.

- `components/catalog/*`
  - public catalog rendering, filters UI, product cards, search, view toggles.
- `components/cart/*`
  - cart UI, checkout dialog, floating cart controls.
- `components/business/*`
  - admin-facing editors, wrappers, business context UI, upload controls.
- `components/ui/*`
  - low-level reusable primitives.

Rule:
- components should own rendering and interaction;
- components may call hooks/store/actions, but should not become the primary source of business invariants.

### `store/`

This is client state.

- `store/cart.ts`
  - per-business cart slices;
  - promo application state;
  - delivery selection state;
  - virtual order snapshot creation.
- `store/catalog-filters.ts`
  - per-business public catalog filters.
- `store/current-business.ts`
  - currently selected business in client context.

Rule:
- store is for client session state, not authoritative catalog data;
- state must stay isolated by `businessId`.

### `lib/`

This is shared logic and infrastructure.

- pure product logic
  - `lib/order.ts`
  - `lib/promo.ts`
  - `lib/discount.ts`
  - `lib/contacts.ts`
- Supabase clients
  - `lib/supabase.ts` for public client usage;
  - `lib/supabase-server.ts` for authenticated server-side work;
  - `lib/supabase-admin.ts` for `service_role`, server-only only.
- business creation helpers
  - `lib/business.ts`
- utilities
  - `lib/slug.ts`, `lib/host.ts`, `lib/utils.ts`, import/export helpers.

Rule:
- `lib` should contain reusable logic or infrastructure, not route-specific rendering concerns;
- anything using `service_role` must stay server-only.

### `types/`

This is the canonical app-level type layer.

- `types/index.ts` maps DB-backed entities into camelCase app types;
- client-only entities such as `CartSlice` and `Order` also live here.

Rule:
- UI and stores should depend on app types, not raw snake_case DB rows.

## Data flow

### Public catalog

1. `{slug}.catlg.ru/` loads business and related catalog data from Supabase.
2. Raw rows are mapped into app types.
3. `BusinessProvider` and catalog components render the public page.
4. Client state for filters and cart lives in Zustand stores.
5. Checkout uses client-side order assembly and generates a WhatsApp/Telegram/phone link.

### Admin write flow

1. Admin pages require an authenticated user.
2. Server actions call `createServerClient()`.
3. Access is checked against `business_user` with owner/admin roles.
4. Entity mutations happen in Supabase.
5. Public/admin pages are refreshed with `revalidatePath`.

### Business onboarding

1. The platform team opens `catlg.ru/onboarding?key=...`.
2. Auth flow ensures a user session exists for the team-operated onboarding session.
3. `lib/business.ts` creates a business through the admin client.
4. The same flow creates the `business_user` owner link.
5. The team hands over `{slug}.catlg.ru/login` plus credentials to the business owner.

## Access model

Current access rules are layered:

- DB layer
  - RLS protects write access and tenant boundaries.
- server layer
  - server actions re-check ownership/admin access via `business_user`.
- UI layer
  - admin controls are conditionally shown only when the user has access.

Rule:
- UI visibility is not a security boundary;
- business ownership and tenant isolation must remain valid even if a client forges requests manually.

## Current invariants

These are the project rules that should not be broken.

- `service_role` must never leak into client code.
- cart state must stay isolated by `businessId`.
- one business must not attach its product to another business's category or brand.
- public catalog writes must not be available to `anon`.
- temporary/debug flows must not live in production routes.
- `app/[slug]/page.tsx` is the public catalog entry point.
- `{slug}.catlg.ru/login` is the only normal owner sign-in entry.
- after owner sign-in, work continues on `{slug}.catlg.ru/` in overlay/admin mode.
- `catlg.ru/admin` is reserved for the future platform backoffice, not tenant business admin.
- server actions are the write boundary for admin operations.
- `types/index.ts` and `docs/reference/data-model.md` should describe the same conceptual entities.
- client checkout is virtual: it generates a contact message, not a persisted order row.

## Known pressure points

These areas are functional but structurally heavy.

- `app/admin/product/actions.ts`
- `app/admin/business/actions.ts`
- `components/business/business-profile-editor-sheet.tsx`

These files mix multiple responsibilities and are the next refactor targets.

## Refactor direction

The next safe architectural moves are:

1. keep this document in sync with the real code;
2. split large action files by role:
   - access checks
   - validation
   - queries/mutations
   - storage/upload logic
3. centralize duplicated access rules across `business`, `category`, `brand`, and `product`;
4. avoid expanding abstractions before the heavy files are decomposed.
