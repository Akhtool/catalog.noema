# Core Scope

## Purpose

This document fixes the product core that should stay stable unless there is a strong business reason to change it.

It is used for product and engineering prioritization.

## Core functions

These functions define the current value of the product and should not be casually rewritten:

- business profile and branding
  - name, description, logo, cover, accent color
  - business contacts and order channels
- tenant catalog structure
  - categories
  - brands
  - products
  - product images
- public catalog on business subdomain
  - `{slug}.catlg.ru/`
  - search, filters, product cards, product details
- owner workflow on the same catalog route
  - `{slug}.catlg.ru/login`
  - owner/admin overlay on `{slug}.catlg.ru/`
- cart and checkout
  - add to cart
  - comment
  - promo
  - delivery type and pickup point selection
- virtual order sending
  - WhatsApp
  - Telegram
  - phone
- business onboarding in the current operating model
  - team creates the business
  - owner receives `{slug}.catlg.ru/login` and credentials
  - owner can finish setup and make a first test order

## Secondary features

These features may be useful, but they are not allowed to destabilize the core:

- richer analytics and dashboards
- platform backoffice at `catlg.ru/admin`
- subscription management and billing UI
- bulk UX polish beyond the critical admin path
- advanced media editing
- custom themes beyond current branding controls
- SEO extras
- custom domains
- stored orders / CRM / customer accounts
- online payments
- advanced role systems

## Rules for new features

A new feature is allowed only if at least one of these is true:

- it directly improves activation
  - new business reaches a working catalog faster
- it directly improves retention
  - owner updates the catalog more reliably or more often
- it directly improves revenue
  - helps sell subscriptions, keep subscriptions, or reduce churn
- it reduces real operational cost
  - removes manual work from the team
  - reduces support load
- it protects the existing core
  - security
  - stability
  - observability
  - release safety

## Rejection rules

A feature should be postponed if:

- it adds complexity without helping activation, retention, revenue, or operational cost;
- it requires rewriting stable core flows without clear evidence;
- it introduces a second competing workflow for an existing core action;
- it is mainly an “improvement idea” without a concrete user or business problem;
- it expands scope outside `docs/reference/product-contract.md`.

## Core change bar

Changing the core requires all of the following:

1. A concrete problem statement.
2. A clear reason why the current core flow is insufficient.
3. An explicit update to:
   - `docs/reference/product-contract.md`
   - `docs/reference/routing-rules.md` if routes change
   - this document
4. Protection of the changed flow with tests when the change affects the critical path.

## Current product priority

Until there is strong evidence otherwise, priority goes in this order:

1. Keep the current core flow stable.
2. Remove operational bottlenecks.
3. Improve owner activation and first successful order.
4. Add only the smallest useful non-core features.
