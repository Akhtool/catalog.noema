# Heavy File Decomposition 2026-03-08

## Scope

Control point for incremental refactoring of the heaviest admin files:

- `app/admin/product/actions.ts`
- `components/business/business-profile-editor-sheet.tsx`
- `app/admin/business/actions.ts`

The goal of this pass was to reduce duplication and split responsibilities without
changing the public action API, Supabase query flow, or admin behavior.

## Product Actions

- Delegated business access check to `app/admin/product/product-guards.ts`.
- Delegated category/brand tenant validation to `app/admin/product/product-guards.ts`.
- Delegated basic payload validation for `name`, `categoryId`, and `price`.
- Extracted `buildProductWritePayload` for shared create/update payload mapping.
- Extracted `getAccessibleProductBusinessId` for repeated `productId -> business_id`
  lookup and owner/admin access check.
- Extracted `revalidateProductPaths` for shared post-mutation revalidation.
- Switched product image actions to reuse shared access and revalidation helpers.
- Moved product image actions into `app/admin/product/product-image-actions.ts`.
- Moved shared action helpers into `app/admin/product/product-action-helpers.ts`.
- Kept the public import path stable via re-exports from `app/admin/product/actions.ts`.
- Restored correct UTF-8 rendering for `app/admin/product/actions.ts`.
- Restored correct UTF-8 rendering for `app/admin/product/product-image-actions.ts`.

Additional confirmed checkpoint:

- `app/admin/product/actions.ts` reduced from about `869` lines to about `700` lines
  after extracting image flow.
- `app/admin/product/actions.ts` reduced further to about `456` lines after extracting
  bulk/export flow into `app/admin/product/product-bulk-actions.ts`.

## Business Profile Editor Sheet

- Extracted shared helpers into `components/business/business-profile-editor-utils.tsx`.
- Extracted business image upload flow into `components/business/business-profile-image-upload.ts`.
- Extracted business location save flow into `components/business/business-location-save.ts`.
- Extracted business location toggle/delete flow into `components/business/business-location-ops.ts`.
- Extracted UI sections into dedicated components:
  - `components/business/business-profile-media-section.tsx`
  - `components/business/business-profile-about-section.tsx`
  - `components/business/business-profile-settings-section.tsx`
  - `components/business/business-locations-section.tsx`
  - `components/business/business-promo-section.tsx`
  - `components/business/business-accent-color-section.tsx`
  - `components/business/business-profile-save-footer.tsx`
  - `components/business/business-location-delete-dialog.tsx`
- Restored correct UTF-8 rendering for user-facing strings and comments in the sheet.
- Reduced `components/business/business-profile-editor-sheet.tsx` from `1700+` lines
  to about `841` lines.

## Business Actions

- Extracted shared auth/access helpers into `app/admin/business/business-action-helpers.ts`.
- Extracted `revalidateBusinessPath` usage for location mutations.
- Extracted `getAuthenticatedUser`, `getLocationBusinessId`, and business access helpers.
- Extracted `buildBusinessUpdatePayload` and related normalizers.
- Switched `updateBusiness` to shared payload preparation.
- Restored correct UTF-8 rendering for user-facing strings and comments in
  `app/admin/business/actions.ts`.

## Intentionally not changed

- No changes to exported action signatures.
- No changes to Storage bucket behavior.
- No changes to SQL semantics for create/update/delete/restore/reorder.
- No UI refactor in product editor components.
- No move to a separate `product-images.ts` module yet.
- No change to business UI behavior or sheet interaction model.
- No change to business/location SQL semantics.

## Verification

Manual verification after each micro-step:

- `npm.cmd run test:run`
- `npm.cmd run typecheck`

At this control point both checks are green.
- `npm.cmd run dev`

## Next safe steps

- Stage 6: centralize repeated access rules across `business`, `product`, `category`,
  and `brand`.
- Revisit `components/business/business-profile-editor-sheet.tsx` later only if there
  is a strong reason to push it below the current size.
