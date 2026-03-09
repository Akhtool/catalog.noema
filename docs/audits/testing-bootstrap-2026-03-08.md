# Testing Bootstrap 2026-03-08

## Added

- `Vitest` as the minimal test runner.
- `jsdom` for client-side store and utility tests.
- `test/setup.ts` with automatic `localStorage` cleanup.
- `npm run test` and `npm run test:run` scripts.

## Covered

### Public catalog

- `store/catalog-filters.test.ts`
  - per-business filter isolation
  - brand filter toggle and reset
- `lib/discount.test.ts`
  - discount activity by date range
  - discount percent calculation

### Cart

- `store/cart.test.ts`
  - per-business cart isolation
  - promo application stays inside one business cart
  - promo state resets when the last item is removed
  - order snapshot includes totals and pickup point

### Checkout

- `lib/promo.test.ts`
  - promo validation
  - minimum order threshold
  - discount cap behavior
- `lib/order.test.ts`
  - order message generation
  - contact priority selection
  - deep link creation
  - `delivery_types` normalization

### Admin access and product save

- `app/admin/product/product-guards.test.ts`
  - owner/admin access check against `business_user`
  - payload validation before create/edit
  - tenant guard for `categoryId`
  - tenant guard for `brandId`
  - positive same-business create/edit path
- `app/admin/_lib/access-control.test.ts`
  - shared owner/admin access primitives
  - entity -> business resolution
  - not-found and wrong-business guard paths

### Auth and onboarding

- `lib/auth-redirect.test.ts`
  - resolve first linked business slug after login
  - allow redirect only inside the root-domain zone
- `lib/business.test.ts`
  - reject unauthenticated business creation
  - create business with unique slug fallback
  - create owner link and revalidate the new catalog
  - surface owner-link failure as a user-facing error

### Admin server actions

- `app/admin/product/actions.test.ts`
  - reject create without auth
  - create product with normalized write payload
  - update product through resolved business access
- `app/admin/business/actions.test.ts`
  - check owner/admin access by business slug
  - return business id on denied access
  - update location through shared location access guard
- `app/admin/category/actions.test.ts`
  - create category with next order
  - update category through shared access guard
  - block delete when related products exist
- `app/admin/brand/actions.test.ts`
  - create brand with normalized payload
  - update brand through shared access guard
  - deactivate related products before delete

## Not covered yet

- some negative/error branches in admin actions are still missing;
- no heavy UI or e2e layer was added yet.

## Manual commands

Install dependencies:

```powershell
npm.cmd install -D vitest jsdom @testing-library/react @testing-library/jest-dom
```

Run checks:

```powershell
npm.cmd run test:run
npm.cmd run typecheck
```
