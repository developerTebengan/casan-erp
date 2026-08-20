# Casan ERP — Product Requirements Document

**Product:** Casan ERP  
**Tagline:** *Minta. Setujui. Terima. Stok jujur.*  
**Audience:** Internal Casan staff (pemohon, approver, admin gudang, keuangan)  
**Platform:** SvelteKit web app (desktop + phone), Bahasa-first  
**Owner:** PT CASAN Energi Indonesia  
**Status:** Describes shipped product through **v0.8.0** (2026-08-20)  
**Live:** https://casan-erp.vercel.app  
**Document version:** 1.3  
**Date:** 20 August 2026

This document is the product definition. Release history lives in [CHANGELOG.md](../CHANGELOG.md). Implementation notes for individual drops live under `docs/superpowers/specs/`.

---

## 1. Why this exists

CASAN runs a physical charging network. Someone has to buy cables, sockets, tools, office stock, and site supplies — and someone else has to say yes before money leaves the company. That loop used to be WhatsApp, spreadsheets, and memory.

Casan ERP is the system of record for **purchase requests → sequential approval → goods receipt → inventory**, plus a **petty cash box** for small cash stock buys that never go through a PR. It is not a second set of books. It is the shared queue that replaces “sudah aku chat ke Bu Siti,” and the cash tin that used to live in a drawer.

COLOKIN! trains drivers on the network. This product trains the office on the same company: one request, three named approvers, stock that only moves when goods actually arrive (or when cash is paid over the counter).

**The product is not “ERP.” Habit is the product:** open the queue, decide today, receive what showed up, leave the rest waiting, top up the cash box when it is empty.

---

## 2. What this is / is not

| This is | This is not |
|---|---|
| One-company procurement + inventory | Multi-tenant SaaS |
| Purchase **requests** with three sequential approvals | Formal purchase orders, contracts, or accounts payable |
| Stock that changes only via goods receipt, petty-cash buy, or an audited stock movement | A warehouse WMS, barcode, or multi-location system |
| One petty cash box with a running balance and a refund audit vs catalog | A general ledger, chart of accounts, or multi-box treasury |
| CSV exports of stock movement, petty cash ledger, and refunds (Excel-openable) | A BI / report builder |
| In-app notifications for “waiting on you” / “your PR was decided” | Email, WhatsApp, or SMS dispatch |
| Bahasa Indonesia default, English toggle | An English-first demo with Indonesian dates bolted on |
| Role homes: my queue, my PRs, or ops counts | A generic four-card dashboard for everyone |

Do not add General Ledger, sales invoices, payroll, CRM, or a second warehouse until the current loop is the only way Casan buys and receives goods.

---

## 3. Design pillars

| Pillar | What it means | What it forbids |
|---|---|---|
| **Every control tells the truth** | Save persists. The bell is unread count or hidden. Tabs that do nothing do not exist. Export downloads the filters on screen. | Fake red dots. Settings Save that toasts and writes nowhere. Demo passwords on production. A button labelled Excel that ignores the date filter. |
| **Satu antrian = satu pekerjaan** | After login, the first screen is the user’s job: approve, request, or watch stock. Kas kecil is the cash desk for Admin and Finance. | Marketing filler (“avg purchase”). One dashboard for all roles. |
| **Stok hanya bergerak dengan bukti** | Product stock on edit is read-only. IN from an approved PR is per line. Petty-cash IN is amount paid against a product. Reverse is an opposite ledger row, not a delete. | Typing a new stock number on the product form. Receiving the whole PR when one carton is still on the truck. |
| **Uang kas kecil punya jejak** | Top-up and spend change the box. A refund row is unused catalog budget, not cash coming back. Editing a top-up replays the ledger and cannot bankrupt a later spend. | Silent balance edits. Rewriting a spend that already moved stock. |
| **Bahasa di chrome, angka di Indonesia** | Menus, toasts, empty states, and role names go through `t()`. Money and dates stay `id-ID` / IDR in both languages. Calendar-day filters use Asia/Jakarta. | Raw enums (`DEPARTMENT_HEAD`). USD. `MM/DD/YYYY` as the default. |

Pillar 1 is non-negotiable. Staff will not trust an approval tool that lies about notifications, or a cash box whose export does not match the list.

---

## 4. Users and jobs

| Role (enum) | Label (id / en) | Job after login |
|---|---|---|
| `USER` | Pemohon / Requester | Create PRs, watch **PR saya**, check stock read-only, raise PR from low stock |
| `DEPARTMENT_HEAD` | Kepala Departemen / Department Head | **Antrian saya** — first approval |
| `FINANCE` | Keuangan / Finance | **Antrian saya** — second approval; suppliers; **top up and review petty cash** (cannot buy stock) |
| `MANAGER` | Manajer / Manager | **Antrian saya** — final approval (with Direktur) |
| `DIRECTOR` | Direktur / Director | **Antrian saya** — final approval (with Manajer) |
| `ADMIN` | Admin / Admin | Ops home: low stock + pending PRs; users; settings; receive goods; reassign approvers; **run the petty cash box and buy stock with cash** |

**Pemohon is not a warehouse admin.** They can view inventory so they know what to request. They cannot create products, post stock, receive goods, save company settings, or open petty cash.

Approvers see a compact low-stock link when anything is below minimum. They do not receive goods unless they also have `purchasing:receive` (Admin only in this version).

Finance can fill the cash box and read the ledger. Only Admin can spend it on stock (`stock:write` + `pettyCash:write`).

---

## 5. Core loops

### 5.0 Two ways stock comes in

```
A. Planned buy                          B. Counter buy (petty cash)
NEED → PR-YYYY-NNN                      NEED (small / cash / walk-in)
   → three named approvers                 → Admin pays from the box
   → receive this line                     → stock IN, source PETTY_CASH
   → stock IN, source PURCHASE             → spend = amount paid
STOCK                                      → refund row if paid < catalog
```

Use **A** when someone must say yes before money leaves. Use **B** when Admin already paid cash at a shop and the goods are in hand. Do not mix: petty cash does not attach to a PR goods receipt.

### 5.1 Purchase request

Required on create:

- Department (catalog): Operations, Warehouse, Purchasing, IT, Finance, HR, Sales
- Purpose (catalog): Restock, Operations, Project, Maintenance, New equipment, Event, Office supplies, Other
- Date required, decision deadline (latest date to approve or reject)
- At least one line: product, qty, price; **supplier required per line**
- Optional **tax, shipping, other fees** on the PR header (non-negative; default 0). **Grand total** = sum of line subtotals + fees. Shown on create, detail, and print.
- Three named approvers (department head, finance, final)

System assigns `PR-YYYY-NNN` on save (year from request date, sequence per year). Users do not type PR numbers.

If the product has linked suppliers, the line supplier defaults to the **first linked supplier** when the product is chosen. Product and supplier fields are searchable. Header default supplier does not exist.

Priority exists on the data model (`LOW` … `URGENT`) but is **not** a list column or filter. Do not resurrect it on the list without a product reason.

### 5.2 Sequential approval

Order is fixed: Kepala Departemen → Keuangan → Final (Manajer or Direktur).

- A later level cannot decide until the previous assigned level is `APPROVED`.
- Reject requires a reason; overall PR becomes `REJECTED`; no further receive.
- Admin may approve/reject any pending level and reassign the person on that level.
- Decision deadline drives overdue / due-soon highlighting on pending PRs.
- List shows agreement progress (e.g. 2/3 agreed) and purpose.

Notifications:

- `PR_WAITING` — only the approver whose level is currently actionable
- `PR_DECIDED` — requester, when a level is approved or rejected
- Next actionable approver also gets `PR_WAITING` when the chain advances

In-app only. Bell = latest 20 for the current user, unread first, numeric badge or hidden.

### 5.3 Goods receipt

Only when overall approval is `APPROVED` and at least one line still has remaining qty.

- Receive **this item**, not the whole PR by default.
- Qty defaults to invoiced amount still due for that line (`ordered − already received`).
- **Unit price** on receive defaults to the PR line price; user may change it for this delivery. Catalog product price is **not** updated on receive.
- Later deliveries wait: list status `PARTIAL` until every line is `STOCK_IN`.
- Receipt status is visible per PR line and grouped by product type (category).
- Inventory shows last-in date from purchase receipts (and other IN movements).

**Leftover (v0.8):** After goods are in (partial OK), Admin compares **approved grand total** (lines + header fees) to **actual goods** (sum of received qty × unit price, falling back to PR line price when unit price was not stored) plus **actual extras** (actual tax/shipping/other if saved, else header estimates). **Leftover** = max(0, grand − goods − extras). One settlement card per PR — not per supplier. Admin saves actual extras and/or submits a refund request (destination kas kecil or bank). Finance/Admin may also **New refund** from the refund list (amount > 0 and ≤ leftover). Only one **PENDING** or **APPROVED** leftover request per PR at a time.

### 5.4 Stock ledger

| Type | Source | Meaning |
|---|---|---|
| IN | PURCHASE | Goods receipt against a PR |
| IN | PETTY_CASH | Cash buy from the petty cash box |
| IN / OUT / ADJUSTMENT | MANUAL | Count correction with a note |
| opposite row | reverse of an existing tx | Audit-safe undo — never delete the original |

List and CSV share: search, product, type (`IN` / `OUT` / `ADJUSTMENT`), From / To (inclusive Asia/Jakarta calendar days). Export cap 5,000 rows. File is UTF-8 CSV with BOM so Excel opens it (`stock-movement.csv`).

Soft-deleted rows stay out of live lists. Product stock on the edit form is display-only.

### 5.5 Petty cash box

One account (`petty_cash_accounts.id = default`) with a running `balance`. First top-up is the opening. There is no separate opening-balance wizard.

| Type | Effect on balance | Who | When |
|---|---|---|---|
| `TOP_UP` | Increases by amount | Admin, Finance | Cash put into the box |
| `SPEND` | Decreases by **amount paid** | Admin (stock buy) | Fail if balance too low |
| `REFUND` | **Does not change balance** | System | Paid **less** than catalog unit × qty |
| `TRANSFER` | **Does not change balance** | Finance/Admin | Approved PR leftover returned to rekening kantor |

**PR leftover (v0.8):** Separate from catalog variance. Created from the PR settlement card or **Refunds → New refund**. Approve to kas kecil posts a `TOP_UP` with source `PR_LEFTOVER`; approve to bank posts a `TRANSFER` row (balance unchanged).

Refunds are unused catalog budget: that money never left the box. The refund list is the audit of “we budgeted more than the shop charged.” Extra spend (shop more expensive than catalog) comes from petty cash; there is no refund row.

Worked examples (starting balance 1,000,000):

| Catalog total | Paid | Spend | Balance after | Refund list |
|---|---|---|---|---|
| 100,000 | 80,000 | 80,000 | 920,000 | 20,000 |
| 100,000 | 120,000 | 120,000 | 880,000 | none |
| 100,000 | 100,000 | 100,000 | 900,000 | none |

**Edit (top-up only):** Admin/Finance may change a posted top-up amount or note. The ledger is replayed in created-at order. Save is rejected if a later spend would go below zero. Spends and refunds cannot be rewritten. There is no “type a new current balance” field.

**Buy stock with petty cash (Admin):** product, qty, amount paid. Amount paid **starts at catalog total** and follows catalog when product or qty changes, unless the user already typed a different paid amount. Optional actual unit price; optional “update catalog unit price.” Creates stock `IN` (`PETTY_CASH`), a `SPEND`, and a `REFUND` if catalog total > paid. Catalog total uses the product price **before** any catalog update.

Screens:

- `/petty-cash` — balance, top-up, ledger with From / To / Type, CSV, Edit on top-ups, **Buy with petty cash** (Admin only)
- `/petty-cash/refunds` — refund list, date filter, CSV
- `/stock/petty-cash` — buy form (also linked from Stock and from Kas kecil)

CSV files: `petty-cash-ledger.csv`, `petty-cash-refunds.csv`. Same UTF-8 BOM rule as stock.

---

## 6. Modules (shipped)

### 6.1 Auth

- Session cookie; protected `(app)` routes.
- Production **must not start** if `SESSION_SECRET` is missing or still the development default.
- Demo account table on login only when `PUBLIC_SHOW_DEMO_LOGINS` is the string `true`. Production login is email + password.
- Any authenticated user can change their own password (min 8) from the sidebar.

Demo roster (password always `password` when demo logins are enabled): `admin@casanerp.com`, `user@casanerp.com`, `dept.head@casanerp.com`, `finance@casanerp.com`, `manager@casanerp.com`, `director@casanerp.com`.

### 6.2 Dashboard

`GET /api/dashboard` returns `home`: `queue` | `mine` | `ops`.

| `home` | Who | Content |
|---|---|---|
| `queue` | Kepala Departemen, Keuangan, Manajer, Direktur | PRs waiting on this user; overdue first |
| `mine` | Pemohon | Latest 10 of my PRs + low-stock list with **Buat PR** |
| `ops` | Admin | Low-stock count, global pending-approval count, recent PRs |

### 6.3 Inventory

Products: code (auto on create if unset), name, category, unit, stock, minimum stock, purchase price (IDR), photo, active/inactive. Soft delete.

Lists: sort by name, code, stock; low-stock filter; mobile cards under `md`. Last-in date from IN movements.

Product detail: linked **suppliers** (add/remove if `inventory:write`).

Pemohon: view only (no New / Edit / Delete).

### 6.4 Purchasing

List tabs: Waiting / Approved / Unapproved (and derived stock-in / partial). Print list and detail. Sort: `prNumber`, `dateOfRequest`, `decisionDeadline`.

Delete: `purchasing:write` and (Admin or the requester).

### 6.5 Suppliers

Name, type (manufacturer, distributor, retailer, service, general, other), phone, address. Soft delete. Pagination. Finance and Admin may write; Pemohon nav hides the page.

Supplier detail/edit: linked **products** they sell (add/remove if `suppliers:write`). Same join as product detail (`product_suppliers`, unique product + supplier). Do not create a new product or supplier inline on the other form.

### 6.6 Users

Admin only (`/users`). Role assignment. Soft delete. Unique email among non-deleted users.

### 6.7 Settings

Singleton `CompanySettings` id `default`: company name, email, phone, tax ID, address, currency (`IDR`), date format (`DD/MM/YYYY`), items per page (10 / 25 / 50).

Tabs: Company, Application, Changelog. **No** Users/Roles tabs here. `PUT` requires `settings:write` (Admin). Pemohon may view, not save.

`itemsPerPage` drives list `limit`. Currency and date format are stored; list formatting may keep `formatCurrency` / `formatDate` (`id-ID`) until a later pass — do not invent a second formatter here.

### 6.8 Locale

- Cookie `casan-locale`: `id` \| `en`. Default `id`. Path `/`, 1 year, `SameSite=Lax`, not httpOnly.
- Works before login (login page toggle).
- Missing dictionary keys fall back to `id`, then the key.
- Seeded product names and historical PR purposes stay as stored data.
- Petty cash and stock export screens are mostly English chrome (same as stock pages); nav label is `Kas kecil` / `Petty cash`.

### 6.9 Petty cash

See §5.5. Permissions: `pettyCash:view` / `pettyCash:write` for Admin and Finance. Buying stock also requires `stock:write`.

### 6.10 CSV exports

All exports are UTF-8 CSV with a BOM. Buttons may say “Export CSV.” They are meant to open in Excel.

| File | Screen | Filters applied |
|---|---|---|
| `stock-movement.csv` | Stock Movement | Search, product, type, From, To |
| `petty-cash-ledger.csv` | Petty cash | Type, From, To |
| `petty-cash-refunds.csv` | Refund list | From, To |

There is no separate report module.

---

## 7. Permissions (source of truth: `src/lib/permissions.ts`)

| Permission | Admin | Pemohon | Kepala Dept | Keuangan | Manajer | Direktur |
|---|---|---|---|---|---|---|
| dashboard:view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| inventory:view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| inventory:write | ✓ | | | | | |
| stock:view | ✓ | | ✓ | | | |
| stock:write | ✓ | | | | | |
| purchasing:view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| purchasing:write | ✓ | ✓ | | | | |
| purchasing:receive | ✓ | | | | | |
| approvals:view | ✓ | | ✓ | ✓ | ✓ | ✓ |
| suppliers:view | ✓ | ✓* | ✓ | ✓ | ✓ | ✓ |
| suppliers:write | ✓ | | | ✓ | | |
| users:manage | ✓ | | | | | |
| settings:view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| settings:write | ✓ | | | | | |
| pettyCash:view | ✓ | | | ✓ | | |
| pettyCash:write | ✓ | | | ✓ | | |

\* Pemohon: API view for the PR form; sidebar omits `/suppliers`.

Every write API must `403` when the map says no. Tightening the map is the product change; do not special-case pages instead of permissions.

Sidebar **Persetujuan saya** shows a numeric waiting-count badge when `approvals:view` and count > 0. **Kas kecil** shows for Admin and Finance only.

---

## 8. List statuses

Purchase list (derived, not a separate DB enum):

| Status | Meaning |
|---|---|
| WAITING | Not fully approved, or approved with nothing received yet |
| PARTIAL | Approved and some (not all) lines received |
| STOCK_IN | Approved and every line fully received |
| REJECTED | Any rejection on the chain |

PR line receive: `WAITING` / `PARTIAL` / `STOCK_IN` from ordered vs received qty.

---

## 9. Non-goals (still later)

Do not schedule these until the loops in §5 are the daily habit:

- WhatsApp / email send for notifications
- Amount-based approval routing
- Department as a first-class entity (today: string catalog)
- PR file attachments and comment threads
- Formal PO distinct from PR
- Petty cash attached to PR goods receipt
- Approvals on petty-cash top-ups or spends
- Non-stock cash-out (taxi, snacks) from the same box
- Voiding a spend (reverse stock + cash back)
- Full accounting / GL
- Sales, payroll, CRM, multi-warehouse
- Editable permission matrix in Settings
- Product photo uploads that survive serverless disk (Vercel local FS is not durable)
- A standalone report builder beyond the three CSVs in §6.10

CSV export of stock and petty cash **is shipped** (v0.6.x). Do not list it as a future item.

---

## 10. Success

### 10.1 Procurement loop (v0.5)

A Pemohon in Bahasa sees **PR saya**, cannot open Stock Movement, cannot open Kas kecil, and cannot save Settings as a non-admin.

An approver sees **Antrian saya**, a real bell count, and cannot skip a prior pending level.

Warehouse receives one line, leaves the others waiting, and the purchase list shows **Partial**. Receive qty starts at the amount still due.

Production login has no demo password table unless `PUBLIC_SHOW_DEMO_LOGINS=true`. Settings Save round-trips to Postgres.

### 10.2 Petty cash and catalogs (v0.6)

Finance can top up the box and cannot buy stock. Admin can buy; if the box is empty the buy fails.

A shop cheaper than catalog leaves a refund row and does **not** increase the balance. A shop more expensive decreases the box by the full amount paid.

Export CSV on Stock after setting From / To / Type downloads only that window.

Editing a top-up downward is blocked if a later spend would overdraw.

A product lists its suppliers; a supplier lists its products; a new PR line can pick any supplier and prefers the first linked one when empty.

---

## 11. Tech and deploy (constraints, not a wishlist)

- SvelteKit 2, Svelte 5, TypeScript, Tailwind 4, Prisma 7, PostgreSQL
- REST under `/api/*`; session auth in `hooks.server.ts`
- Production build: `prisma generate && prisma migrate deploy && vite build`
- Hosting: Vercel + hosted Postgres (SSL). `SESSION_SECRET` required. GitHub auto-deploy is not connected; ship with `npx vercel --prod --yes` from `stg`.
- Tests: Vitest for services, i18n, catalogs, list status, petty-cash variance, ledger replay, CSV, date bounds. Playwright exists but is not the release gate.

---

## 12. Related documents

| Doc | Role |
|---|---|
| [CHANGELOG.md](../CHANGELOG.md) | Canonical release history (also rendered in Settings → Changelog via `src/lib/version.ts`) |
| `src/lib/version.ts` | In-app copy of changelog bullets — keep in sync with CHANGELOG.md |
| [2026-08-16-phase-0-1-trust-ux-design.md](superpowers/specs/2026-08-16-phase-0-1-trust-ux-design.md) | Shipped UX spec for v0.5.0 |
| [2026-08-18-petty-cash-refunds-design.md](superpowers/specs/2026-08-18-petty-cash-refunds-design.md) | Petty cash box, refunds, first CSV |
| [2026-08-18-csv-petty-cash-edit-supplier-products-design.md](superpowers/specs/2026-08-18-csv-petty-cash-edit-supplier-products-design.md) | Date filters, top-up edit, supplier↔product |
| [2026-08-19-petty-cash-desk-design.md](superpowers/specs/2026-08-19-petty-cash-desk-design.md) | Kas kecil as cash desk |
| COLOKIN PRD (`colokin` repo) | Sister product: driver loyalty game for the same company |

---

## 13. Release summary

Detail lives in the changelog. Product shape by era:

| Version | Date | Shape |
|---|---|---|
| 0.0.1 | 2026-07-08 | Auth, dashboard, inventory, stock, suppliers, purchasing foundations |
| 0.1.0–0.4.0 | 2026-07-28 | Soft delete, print, sequential approval, goods receipt, roles, deadlines |
| 0.5.0–0.5.1 | 2026-08-17 | Trust + Bahasa UX: real settings, real bell, role home, requester lock-down |
| 0.5.2–0.5.4 | 2026-08-18 | PR numbers, department/purpose catalogs, per-line suppliers, per-item receive |
| 0.6.0 | 2026-08-18 | Petty cash box, cash stock buys, refund audit vs catalog, first CSVs |
| 0.6.1 | 2026-08-18 | Stock CSV by date/type, editable top-ups, supplier↔product catalog |
| 0.6.2 | 2026-08-19 | Kas kecil as cash desk: ledger filter/export, buy from that page, paid defaults to catalog |
| 0.7.0 | 2026-08-19 | Searchable catalogs; per-supplier settlement (superseded in 0.8) |
| 0.8.0 | 2026-08-20 | PR header fees; receive unit price; whole-PR leftover; New refund from list |
