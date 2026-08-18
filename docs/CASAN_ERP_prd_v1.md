# Casan ERP — Product Requirements Document v1.0

**Product:** Casan ERP  
**Tagline:** *Minta. Setujui. Terima. Stok jujur.*  
**Audience:** Internal Casan staff (pemohon, approver, admin gudang)  
**Platform:** SvelteKit web app (desktop + phone), Bahasa-first  
**Owner:** PT CASAN Energi Indonesia  
**Status:** Describes shipped product through **v0.5.4** (2026-08-18)  
**Live:** https://casan-erp.vercel.app  
**Date:** 18 August 2026

---

## 1. Why this exists

CASAN runs a physical charging network. Someone has to buy cables, sockets, tools, office stock, and site supplies — and someone else has to say yes before money leaves the company. That loop today is WhatsApp, spreadsheets, and memory.

Casan ERP is the system of record for **purchase requests → sequential approval → goods receipt → inventory**. It is not a second set of books. It is the shared queue that replaces “sudah aku chat ke Bu Siti.”

COLOKIN! trains drivers on the network. This product trains the office on the same company: one request, three named approvers, stock that only moves when goods actually arrive.

**The product is not “ERP.” Habit is the product:** open the queue, decide today, receive what showed up, leave the rest waiting.

---

## 2. What this is / is not

| This is | This is not |
|---|---|
| One-company procurement + inventory | Multi-tenant SaaS |
| Purchase **requests** with three sequential approvals | Formal purchase orders, contracts, or AP |
| Stock that changes only via goods receipt or an audited stock movement | A warehouse WMS, barcode, or multi-location system |
| In-app notifications for “waiting on you” / “your PR was decided” | Email, WhatsApp, or SMS dispatch |
| Bahasa Indonesia default, English toggle | An English-first demo with Indonesian dates bolted on |
| Role homes: my queue, my PRs, or ops counts | A generic four-card dashboard for everyone |

Do not add General Ledger, sales invoices, payroll, CRM, or a second warehouse until the current loop is the only way Casan buys and receives goods.

---

## 3. Design pillars

| Pillar | What it means | What it forbids |
|---|---|---|
| **Every control tells the truth** | Save persists. The bell is unread count or hidden. Tabs that do nothing do not exist. | Fake red dots. Settings Save that toasts and writes nowhere. Demo passwords on production. |
| **Satu antrian = satu pekerjaan** | After login, the first screen is the user’s job: approve, request, or watch stock. | Marketing filler (“avg purchase”). One dashboard for all roles. |
| **Stok hanya bergerak dengan bukti** | Product stock on edit is read-only. IN from an approved PR is per line. Reverse is an opposite ledger row, not a delete. | Typing a new stock number on the product form. Receiving the whole PR when one carton is still on the truck. |
| **Bahasa di chrome, angka di Indonesia** | Menus, toasts, empty states, and role names go through `t()`. Money and dates stay `id-ID` / IDR in both languages. | Raw enums (`DEPARTMENT_HEAD`). USD. `MM/DD/YYYY` as the default. |

Pillar 1 is non-negotiable. Staff will not trust an approval tool that lies about notifications.

---

## 4. Users and jobs

| Role (enum) | Label (id / en) | Job after login |
|---|---|---|
| `USER` | Pemohon / Requester | Create PRs, watch **PR saya**, check stock read-only, raise PR from low stock |
| `DEPARTMENT_HEAD` | Kepala Departemen / Department Head | **Antrian saya** — first approval |
| `FINANCE` | Keuangan / Finance | **Antrian saya** — second approval; may edit suppliers |
| `MANAGER` | Manajer / Manager | **Antrian saya** — final approval (with Direktur) |
| `DIRECTOR` | Direktur / Director | **Antrian saya** — final approval (with Manajer) |
| `ADMIN` | Admin / Admin | Ops home: low stock + pending PRs; users; settings write; receive goods; reassign approvers |

**Pemohon is not a warehouse admin.** They can view inventory so they know what to request. They cannot create products, post stock, receive goods, or save company settings. `/suppliers` is hidden from their nav (the PR form still loads the supplier list).

Approvers see a compact low-stock link when anything is below minimum. They do not receive goods unless they also have `purchasing:receive` (Admin only in v1).

---

## 5. Core loop

```
NEED (low stock or a named purpose)
   ↓  Pemohon creates PR-YYYY-NNN
APPROVE (Kepala Departemen → Keuangan → Final)
   ↓  each level sequential; reject stops the chain
RECEIVE (per line, remaining qty only)
   ↓  stock IN + ledger row, source = PURCHASE
STOCK (truth for the next request)
```

**Session shape:** open app → job screen (10s) → decide 1–5 PRs or receive the lines that arrived → close. Target under five minutes for an approver’s morning pass.

### 5.1 Purchase request

Required on create:

- Department (catalog): Operations, Warehouse, Purchasing, IT, Finance, HR, Sales
- Purpose (catalog): Restock, Operations, Project, Maintenance, New equipment, Event, Office supplies, Other
- Date required, decision deadline (latest date to approve or reject)
- At least one line: product, qty, price; **supplier per line** (header supplier optional)
- Three named approvers (department head, finance, final)

System assigns `PR-YYYY-NNN` on save (year from request date, sequence per year). Users do not type PR numbers.

Priority exists on the data model (`LOW` … `URGENT`) but is **not** a list column or filter in v0.5.x. Do not resurrect it on the list without a product reason.

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
- Qty defaults to invoiced amount still due for that line.
- Later deliveries wait: list status `PARTIAL` until every line is `STOCK_IN`.
- Receipt status is visible per PR line and grouped by product type (category).
- Inventory shows last-in date from purchase receipts.

### 5.4 Stock ledger

| Type | Source | Meaning |
|---|---|---|
| IN | PURCHASE | Goods receipt against a PR |
| IN / OUT / ADJUSTMENT | MANUAL | Count correction with a note |
| opposite row | reverse of an existing tx | Audit-safe undo — never delete the original |

Soft-deleted rows stay out of live lists. Product stock on the edit form is display-only.

---

## 6. Modules (v1 shipped)

### 6.1 Auth

- Session cookie; protected `(app)` routes.
- Production **must not start** if `SESSION_SECRET` is missing or still the development default.
- Demo account table on login only when `PUBLIC_SHOW_DEMO_LOGINS` is the string `true`. Production login is email + password.
- Any authenticated user can change their own password (min 8) from the sidebar.

### 6.2 Dashboard

`GET /api/dashboard` returns `home`: `queue` | `mine` | `ops`.

| `home` | Who | Content |
|---|---|---|
| `queue` | Kepala Departemen, Keuangan, Manajer, Direktur | PRs waiting on this user; overdue first |
| `mine` | Pemohon | Latest 10 of my PRs + low-stock list with **Buat PR** |
| `ops` | Admin | Low-stock count, global pending-approval count, recent PRs |

### 6.3 Inventory

Products: code (auto on create if unset), name, category, unit, stock, minimum stock, purchase price (IDR), photo, active/inactive. Soft delete.

Lists: sort by name, code, stock; low-stock filter; mobile cards under `md`. Last-in date from receipts.

Pemohon: view only (no New / Edit / Delete).

### 6.4 Purchasing

List tabs: Waiting / Approved / Unapproved (and derived stock-in / partial). Print list and detail. Sort: `prNumber`, `dateOfRequest`, `decisionDeadline`.

Delete: `purchasing:write` and (Admin or the requester).

### 6.5 Suppliers

Name, type (manufacturer, distributor, …), phone, address. Soft delete. Pagination. Finance and Admin may write; Pemohon nav hides the page.

### 6.6 Users

Admin only (`/users`). Role assignment. Soft delete. Unique email among non-deleted users.

### 6.7 Settings

Singleton `CompanySettings` id `default`: company name, email, phone, tax ID, address, currency (`IDR`), date format (`DD/MM/YYYY`), items per page (10 / 25 / 50).

Tabs: Company, Application, Changelog. **No** Users/Roles tabs here. `PUT` requires `settings:write` (Admin). Pemohon may view, not save.

`itemsPerPage` drives list `limit`. Currency and date format are stored; list formatting may keep `formatCurrency` / `formatDate` (`id-ID`) until a later pass — do not invent a second formatter in v1.

### 6.8 Locale

- Cookie `casan-locale`: `id` \| `en`. Default `id`. Path `/`, 1 year, `SameSite=Lax`, not httpOnly.
- Works before login (login page toggle).
- Missing dictionary keys fall back to `id`, then the key.
- Seeded product names and historical PR purposes stay as stored data.

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

\* Pemohon: API view for the PR form; sidebar omits `/suppliers`.

Every write API must `403` when the map says no. Tightening the map is the product change; do not special-case pages instead of permissions.

Sidebar **Persetujuan saya** shows a numeric waiting-count badge when `approvals:view` and count > 0.

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

## 9. Non-goals (Phase 2+)

Do not schedule these until the v1 loop is the daily habit:

- WhatsApp / email send for notifications
- Amount-based approval routing
- Department as a first-class entity (today: string catalog)
- PR file attachments and comment threads
- Excel / CSV export
- Formal PO distinct from PR
- Sales, accounting, multi-warehouse
- Editable permission matrix in Settings
- Product photo uploads that survive serverless disk (Vercel local FS is not durable)

---

## 10. Success (v1)

A Pemohon in Bahasa sees **PR saya**, cannot open Stock Movement, and cannot save Settings as a non-admin.

An approver sees **Antrian saya**, a real bell count, and cannot skip a prior pending level.

Warehouse receives one line, leaves the others waiting, and the purchase list shows **Partial**.

Production login has no demo password table. Settings Save round-trips to Postgres.

---

## 11. Tech and deploy (constraints, not a wishlist)

- SvelteKit 2, Svelte 5, TypeScript, Tailwind 4, Prisma 7, PostgreSQL
- REST under `/api/*`; session auth in `hooks.server.ts`
- Production build: `prisma generate && prisma migrate deploy && vite build`
- Hosting: Vercel + hosted Postgres (SSL). `SESSION_SECRET` required.
- Tests: Vitest for services, i18n, catalogs, list status. Playwright exists but is not the v1 gate.

---

## 12. Related documents

| Doc | Role |
|---|---|
| [CHANGELOG.md](../CHANGELOG.md) | Canonical release history (also rendered in Settings → Changelog) |
| `src/lib/version.ts` | In-app copy of that history — keep in sync with CHANGELOG.md |
| [2026-08-16-phase-0-1-trust-ux-design.md](superpowers/specs/2026-08-16-phase-0-1-trust-ux-design.md) | Shipped UX spec for v0.5.0 |
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
