# Routing Rules

## Purpose

This document fixes the public route model of the product and separates:

- client-facing catalog routes;
- business owner routes;
- internal team routes.

## Current route map

### Public client routes

- `catlg.ru/` — platform landing page.
- `{slug}.catlg.ru/` — public catalog of a конкретный business.

### Business owner routes

- `{slug}.catlg.ru/login` — the only normal sign-in entry for a business owner.
- After successful sign-in, the owner stays on `{slug}.catlg.ru/`.
- Owner/admin controls are shown as an overlay on the same catalog route, not on a separate public admin URL.

### Internal team routes

- `catlg.ru/onboarding?key=...` — internal onboarding for the platform team only.
- `catlg.ru/signup` — not a public registration entry; currently redirects to `/`.
- `catlg.ru/admin` — reserved for the future platform backoffice.
- `catlg.ru/admin/sign-in` — reserved for future platform team authentication.

## Invariants

- Business owners must not use `catlg.ru/login` as a normal entry point.
- Business owners must not use root-domain `/signup` or `/onboarding` as public self-service flows.
- Business admin mode lives on the business subdomain catalog itself.
- Root-domain `admin` routes are for the platform team, not for tenant businesses.
- Any new route that changes this model must update:
  - `docs/reference/product-contract.md`
  - `docs/architecture/architecture.md`
  - `docs/checklists/cursor-not-mvp-checklist.md`

## Notes

- Internal onboarding may create a business and initial owner account, but that is an operational team flow, not a public product flow.
- The future platform backoffice at `catlg.ru/admin` is a reserved route contract; its UI is not part of the current tenant-facing flow.
