# Casan ERP Phase 0+1 — Trust and daily UX

**Date:** 2026-08-16  
**Status:** Approved  
**Audience:** One-company ops tool (Casan)  
**Locale:** Bahasa Indonesia default, English toggle  
**Build target:** v0.5.0

## Goal

Make the existing procurement loop trustworthy and usable for daily Casan staff. Every control does what it says. Each role opens to their job. Chrome is Bahasa-first.

## Non-goals (Phase 2+)

WhatsApp/email send, amount-based routing, department entities, PR attachments, comment threads, Excel export, formal PO, sales, accounting, multi-warehouse.

## Decisions locked

- Approach: trust first, then daily UX, then procurement depth (depth is not this spec).
- Default locale `id`. Toggle ID | EN stored in cookie `casan-locale` (works before login).
- Dates and money stay `id-ID` / IDR in both languages.
- Role labels never render raw enums (`DEPARTMENT_HEAD`).
- Fake chrome is forbidden: no Save that does not persist, no bell with a fake red dot.
- Demo logins only when `PUBLIC_SHOW_DEMO_LOGINS=true`.
- `USER` is Pemohon: request and view, not warehouse admin.

## Locale

### Storage

- Cookie `casan-locale`: `id` | `en`. Default `id` if missing or invalid.
- Path `/`, `max-age` 1 year, `sameSite=lax`. Not httpOnly (navbar toggle is client-side).
- `hooks.server.ts` reads the cookie into `locals.locale`.
- Client store `localeStore` mirrors the cookie and re-renders copy.

### API

```ts
type Locale = 'id' | 'en';
function t(key: string, vars?: Record<string, string | number>): string
function roleLabel(role: UserRole, locale: Locale): string
```

Missing keys fall back to `id`, then to the key itself. Interpolation uses `{name}` placeholders.

Dictionary lives in `src/lib/i18n/id.ts` and `src/lib/i18n/en.ts`, merged by `src/lib/i18n/index.ts`. No third-party i18n library.

### Copy coverage (this phase)

Login, sidebar, navbar, toasts, empty states, validation messages, settings, dashboard, approvals, purchasing list headers, inventory list headers, role names, notification titles.

Forms already filled in English (product names, seeded PR purposes) stay as data. UI chrome is translated.

### Role labels

| Enum | id | en |
|---|---|---|
| ADMIN | Admin | Admin |
| USER | Pemohon | Requester |
| DEPARTMENT_HEAD | Kepala Departemen | Department Head |
| FINANCE | Keuangan | Finance |
| MANAGER | Manajer | Manager |
| DIRECTOR | Direktur | Director |

### Navbar title

Shows the current page name (`Dasbor`, `Persediaan`, `Permintaan pembelian`, …), not a second “Casan ERP”. Sidebar keeps the brand + version.

## Role home

`GET /api/dashboard` returns a `home` discriminator plus role-specific payload. `/dashboard` renders that, not the same four count cards for everyone.

| Role | `home` | Content |
|---|---|---|
| DEPARTMENT_HEAD, FINANCE, MANAGER, DIRECTOR | `queue` | PRs waiting on this user, overdue first, then due soon, then the rest. Link each row to `/purchasing/[id]`. |
| USER | `mine` | This user’s PRs (latest 10) + low-stock products with CTA “Buat PR” → `/purchasing/new?fromLowStock=1`. |
| ADMIN | `ops` | Low-stock count, pending-approval count (global waiting PRs), recent PRs. No marketing “avg purchase” filler. |

Approver roles still see a compact “stok menipis” link if `lowStockItems > 0`, below the queue.

## Notifications

Replace the decorative bell.

### Model `Notification`

- `id` uuid
- `userId` uuid (FK users)
- `type` enum: `PR_WAITING` \| `PR_DECIDED`
- `title` string (store already-translated snapshot in the actor’s locale at write time is wrong — store keys + params)
- `titleKey` string
- `bodyKey` string
- `params` Json (`{ prNumber, status }` etc.)
- `href` string (e.g. `/purchasing/{id}`)
- `readAt` DateTime?
- `createdAt` DateTime

### When to write

- PR created or approvers assigned → `PR_WAITING` to each assigned approver whose level is currently actionable (first pending level only).
- A level is approved or rejected → `PR_DECIDED` to the requester. If approval moves to the next person, also `PR_WAITING` to that next approver.

### UI

- Bell opens a panel: latest 20 for the current user, unread first.
- Unread count badge (number, not a permanent red dot). Hide badge at 0.
- Click a row: mark read, go to `href`.
- `GET /api/notifications` and `POST /api/notifications/[id]/read`.
- Empty: “Tidak ada notifikasi”.

## Settings

Singleton Prisma model `CompanySettings` with id `"default"`:

- `companyName`, `email`, `phone`, `taxId`, `address` (strings)
- `currency` default `"IDR"`
- `dateFormat` default `"DD/MM/YYYY"`
- `itemsPerPage` default `10` (allowed 10, 25, 50)
- `updatedAt`

Seed the current hardcoded values (Casan ERP Indonesia, info@casanerp.com, 021-555-1234, 1234567890, Jl. Sudirman No. 123, Jakarta).

`GET`/`PUT /api/settings` require `settings:view`. PUT is ADMIN only (`users:manage` is the existing admin gate — add `settings:write` for ADMIN only).

Settings page:

- Tabs: Company, Application, Changelog. Remove Users and Roles tabs.
- Company and Application bind to loaded settings. Save calls PUT and toasts success or validation error.
- Changelog unchanged.

`itemsPerPage` is used by inventory, purchasing, stock, and suppliers list fetch `limit` after this ships. Currency and dateFormat are stored now; list formatting may keep `formatCurrency` / `formatDate` (`id-ID`) until a later pass — do not build a second formatter in this phase.

## Auth and demo

- If `NODE_ENV === 'production'` and `SESSION_SECRET` is missing or still the development default `casan-erp-development-secret-change-in-production`, the server throws at startup in `auth.ts` (fail fast).
- Login demo account box renders only when `PUBLIC_SHOW_DEMO_LOGINS === 'true'`. Local `.env` sets it true. Vercel production does not.
- Sidebar user block gains “Ubah kata sandi”. Modal: current password, new password (min 8), confirm. `POST /api/me/password`. Any authenticated user. Success: toast + close. Wrong current password: 401 on that field.

## Permissions

`USER` role permissions become:

- Keep: `dashboard:view`, `inventory:view`, `purchasing:view`, `purchasing:write`, `suppliers:view`, `settings:view`
- Remove: `inventory:write`, `stock:view`, `stock:write`, `purchasing:receive`, `suppliers:write`
- Add: `settings:write` for ADMIN only (not USER)

Pemohon can still open inventory read-only (no New / Edit / Delete) so they can check stock before requesting. `suppliers:view` stays so the PR form can load the supplier dropdown; hide `/suppliers` from USER nav anyway (`navItemsForRole` skips it for `USER`). Stock Movement disappears from their nav. Goods receipt on PR detail is hidden without `purchasing:receive`. Settings is read-only for USER (no Save).

Approver roles unchanged. ADMIN unchanged.

API routes already check `hasPermission`; tightening the map is sufficient if every write route uses it. Audit stock, products, suppliers, and receive endpoints — they must 403 for USER after the map change.

## Tables

`DataTable` changes:

- Add optional `render?: import('svelte').Snippet<[TData]>` per column. If present, render the snippet. Do not use `{@html}` for new action columns.
- Existing `cell?: (row) => string` stays for simple badges during migration; badges should move to snippets or a `Badge` child over time. Purchasing and inventory **action** columns must not use `{@html}`.
- If `rows.length === 0` and not loading, show `EmptyState` inside the table shell, with optional `empty` snippet (CTA).
- Optional `sortKey` + `onsort`. Header click toggles asc/desc. Caller reloads data (client params `sort`, `order`).
- Drop forced `min-w-160`. Table can shrink; on viewports `< md`, parent pages hide the table and show a card list instead.

Card list (inventory + purchasing + approvals, `< md`):

- Title (name or PR number), status badge, one primary action (open).
- Same row click target as desktop.

Sortable columns this phase: purchasing `prNumber`, `dateOfRequest`, `decisionDeadline`; inventory `name`, `code`, `stock`.

## Nav badge

`AppLayout` loads unread notification count and waiting-approval count for the current user.

- Sidebar item **Persetujuan saya** (`/approvals`) shows a numeric badge when waiting count > 0.
- Only if the role has `approvals:view`.

## Files (ownership)

| Unit | Path | Responsibility |
|---|---|---|
| i18n | `src/lib/i18n/*` | Dictionaries and `t()` |
| locale store | `src/lib/stores/locale.svelte.ts` | Cookie sync, current locale |
| settings | `prisma` + `src/lib/server/services/settings.service.ts` + `/api/settings` | Persist company/app settings |
| notifications | `prisma` + `notification.service.ts` + `/api/notifications` | Inbox writes and reads |
| permissions | `src/lib/permissions.ts` | USER map + nav labels via `t()` |
| dashboard | `/api/dashboard` + dashboard page | Role home |
| DataTable | `src/lib/components/ui/DataTable.svelte` | Snippets, empty, sort |
| chrome | Navbar, Sidebar, login, settings | Locale, titles, bell, password |

## Testing

- Unit: `t()`, locale fallback, `roleLabel`, USER permission map, settings validation, notification targeting (which user ids on create vs approve).
- Do not add Playwright e2e in this phase (existing e2e install is heavy). Vitest server tests are enough.

## Success

A Pemohon logging in locally in Bahasa sees **PR saya**, cannot open Stock Movement, and cannot save Settings company as a non-admin. An approver sees **Antrian saya** and a real bell count. Production login has no demo password list. Settings Save round-trips to Postgres.
