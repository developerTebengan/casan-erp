# Refund settlement + combobox Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans. Inline execution (user: go for it).

**Goal:** Searchable product/supplier selects, per-supplier PR settlement with leftover refund requests, kas kecil source of fund and a clearer ledger.

**Architecture:** Pure helpers for leftover, combobox filter, supplier keys, and ledger replay. Prisma models `RefundRequest` and `PurchaseSupplierSettlement` plus `sourceOfFund` / `TRANSFER`. Services for settle/submit/approve. One `Combobox` used on stock, PR lines, and petty-cash buy.

**Tech Stack:** SvelteKit 2, Prisma, Vitest, existing CSV/dayRange/permissions.

## Global Constraints

- Leftover uses full PR line totals for that supplier (qty × price).
- Catalog-variance stays `REFUND` ledger rows; refund *requests* are PR leftover only.
- Header default supplier removed; line supplier required on new/updated PRs.
- Top-up edit still cannot bankrupt a later spend. TRANSFER and REFUND do not change balance.
- CSV UTF-8 BOM. App version 0.7.0.
- No bank API.

### Task 1: Pure helpers + tests

**Files:** `src/lib/purchasing/settlement.ts`, `src/lib/ui/comboboxFilter.ts`, `src/lib/petty-cash/sourceOfFund.ts`, extend `ledger.ts`

Then Prisma, services, APIs, UI, docs (CHANGELOG, version, PRD).

### Task 2: Schema migration 20260819100000_refund_settlement

### Task 3: Services + API

### Task 4: Combobox + forms + kas kecil + refunds UI

### Task 5: Version 0.7.0 changelog and tests green
