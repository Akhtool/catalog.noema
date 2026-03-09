# Data Model and Migrations Audit 2026-03-09

## Summary

Current state is only partially consistent. The repo explains most of the live schema, but stage 8 is not fully complete yet.

Confirmed:

- core V2 tables and relations exist in repo migrations;
- later business fields are represented by targeted `ALTER TABLE` migrations;
- indexes and access-related constraints for the main admin entities are present in repo SQL.

Main result:

- the repo migration history is mostly usable;
- several important mismatches still exist between documentation, migration inventory, and runtime expectations.

## Confirmed Matches

### Entities and relations

- `migrations/v2_data_model.sql` creates:
  - `brand`
  - `product_image`
  - `profile`
  - `business_user`
- `product.brand_id -> brand.id` exists and uses `ON DELETE SET NULL`.
- `product_image.product_id -> product.id` exists and uses `ON DELETE CASCADE`.
- `business_user.business_id -> business.id` and `business_user.user_id -> profile.id` exist.
- `migrations/add_business_location.sql` adds `business_location` with FK to `business(id)`, trigger, indexes, and RLS.

### Indexes

Confirmed indexes in repo migrations:

- `idx_brand_business_id`
- `idx_brand_is_active`
- `idx_brand_business_active`
- `idx_product_image_product_id`
- `idx_product_image_position`
- `idx_product_brand_id`
- `idx_product_business_category`
- `idx_product_is_active`
- `idx_business_user_business_id`
- `idx_business_user_user_id`
- `idx_business_user_role`
- `idx_business_location_business_id`
- `idx_business_location_order`

### Constraints and access-related schema

- `business_user.role` is constrained to `owner | admin`.
- `business_user` has `UNIQUE(business_id, user_id)`.
- RLS for V2 entities is defined in `migrations/v2_auth.sql`.

## Mismatches and Risks

### 1. `delivery_types` had been missing from repo migrations

Evidence:

- `lib/database.types.ts` includes `business.delivery_types`;
- app/runtime code reads `business.delivery_types`;
- `docs/reference/data-model.md` documents `delivery_types`;
- this gap has now been closed by `migrations/add_delivery_types_to_business.sql`.

Impact before the fix:

- repo migrations were not a complete source of truth for current schema;
- a fresh environment built only from repo SQL could drift from runtime expectations.

Fix applied:

- added `migrations/add_delivery_types_to_business.sql`;
- updated migration inventory docs accordingly.

### 2. `docs/reference/data-model.md` says brands are soft-deleted, but current admin behavior deletes rows

Evidence:

- the document says physical delete is not used;
- current `app/admin/brand/actions.ts` uses `.delete().eq("id", brandId)`;
- schema explicitly allows physical delete through `product.brand_id ON DELETE SET NULL`.

Impact:

- documentation states a stronger invariant than the code really enforces.

Required fix:

- either move code to true soft delete,
- or document the actual current behavior.

### 3. `docs/reference/data-model.md` says product must have at least one image, but schema/code do not enforce it

Evidence:

- the document says there is a minimum of one image per product;
- schema does not enforce a minimum image count;
- product create flow allows products before image upload.

Impact:

- documentation overstates a schema invariant that is not real.

Required fix:

- treat it as UI/business preference in docs,
- or add explicit server-side enforcement later.

### 4. `migrations/README.md` classifies now-required schema pieces as optional

Evidence:

- README lists `add_business_location.sql`, `add_business_theme_brand.sql`,
  `add_whatsapp_per_delivery_type.sql`, and `add_promo_to_business.sql` as optional;
- current code and types assume these parts belong to the live schema.

Impact:

- misleading setup/bootstrap instructions;
- higher chance of incomplete environments.

Required fix:

- rewrite migration inventory into:
  - required current schema
  - security hotfixes
  - legacy / rollback / historical reference

### 5. `rollback_v2_changes.sql` is stale for the current schema

Evidence:

- it only rolls back early V2 structures;
- it does not cover later additions such as:
  - `business_location`
  - promo fields
  - theme brand fields
  - per-delivery WhatsApp fields
  - `working_hours`
  - public-write RLS cleanup in `supabase/migrations/20250307_remove_public_write_rls.sql`

Impact:

- the file cannot be trusted as a full rollback for the current app schema;
- its current name implies broader safety than it actually provides.

Required fix:

- mark it as legacy / partial rollback only;
- do not present it as the rollback path for the current schema.

## Recommended Repo Fixes

### Immediate doc fixes

1. Update `migrations/README.md`:
   - separate required current-schema migrations from legacy files;
   - mark `rollback_v2_changes.sql` as partial/stale.
2. Update `docs/reference/data-model.md`:
   - align brand deletion semantics with actual code;
   - relax the “minimum one image” statement unless enforcement is added.
3. Add migration rules:
   - every new schema field used in runtime types or app code must have a repo migration;
   - rollback files must declare exact scope.

### Required schema follow-up

1. Re-check `lib/database.types.ts` after the next real DB migration/apply cycle.

## Migration Rules

- one schema change = one targeted migration file;
- every runtime field in `lib/database.types.ts` must be traceable to a repo migration;
- rollback files must be scoped and named narrowly;
- security hotfixes and schema evolution should stay in separate files;
- `migrations/README.md` must classify files by purpose.

## Stage 8 Status

Current status after this audit:

- `docs/reference/data-model.md` vs repo migrations: audited
- constraints and relations: audited
- indexes: audited
- disputed migrations: identified
- migration rules: defined

Stage 8 can now be considered complete at the repo level. The remaining work here is operational: apply the new migration to environments that still lack `business.delivery_types`.
