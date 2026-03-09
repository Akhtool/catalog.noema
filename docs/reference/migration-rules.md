# Migration Rules

## Purpose

These rules keep schema evolution understandable and reproducible.

## Rules

- Every runtime schema change must have a dedicated repo migration.
- Every field used in app code or generated Supabase types must be traceable to a migration file in this repo.
- Do not mix schema evolution, security hotfixes, and rollback logic in one file.
- Rollback files must state exact scope and cutoff date in the filename or header.
- `migrations/README.md` must classify migrations into:
  - required current schema
  - security hotfixes
  - legacy or partial rollback files
- New migrations should explain:
  - what changes
  - why it is needed
  - whether it is required for fresh environments
  - whether it needs rollback or manual recovery notes

## Minimum checklist for a new migration

1. Add the SQL file.
2. Update `migrations/README.md`.
3. Update `docs/reference/data-model.md` if the conceptual model changed.
4. Re-check generated DB types if the application consumes the new field.
