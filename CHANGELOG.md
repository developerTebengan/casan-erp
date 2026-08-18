# Changelog

All notable changes to **Casan ERP** are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions are `MAJOR.MINOR.PATCH` for a pre-1.0 product.

- **0.5.x** — Bahasa-first procurement loop (ask → approve → receive → honest stock).
- **0.6.x** — Petty cash box, CSV exports, supplier↔product catalog.

Product definition: [docs/CASAN_ERP_prd_v1.md](docs/CASAN_ERP_prd_v1.md). Live: https://casan-erp.vercel.app.

In-app **Settings → Changelog** reads the same **Added / Changed / Fixed / Removed** bullets from `src/lib/version.ts`. Keep those lists in sync with this file. Longer “why / who / how” notes below are changelog-only.

Exports are UTF-8 CSV with a BOM so Microsoft Excel opens them. Buttons say **Export CSV**.

---

## [Unreleased]

## [0.6.2] - 2026-08-19

Kas kecil is the daily cash desk, not a side page you only visit to top up.

**Who:** Admin runs the box and buys stock from this screen. Finance still only tops up and reads the ledger.

**How to use**

1. Open **Kas kecil**. Set **From / To / Type**, then **Export CSV** — the file matches the list (`petty-cash-ledger.csv`).
2. Admin: **Buy with petty cash**. Amount paid starts at catalog unit × qty.
3. Change product or qty: paid updates unless you already typed a different amount.
4. Cancel on the buy form returns to petty cash.

### Added

- Petty cash ledger date/type filter and CSV export of the current view
- Buy with petty cash button on Kas kecil (Admin; needs `stock:write`)
- Amount paid on a petty-cash buy starts at catalog total; a custom amount is kept if you already typed one

---

## [0.6.1] - 2026-08-18

Three office-ops gaps after the first petty-cash drop: stock export had no date window, a wrong top-up could not be fixed, and suppliers were only a name on a PR line.

**Who:** Anyone with `stock:view` can export stock. Admin and Finance can edit a **top-up**. Admin (`inventory:write`) links suppliers on a product; Admin/Finance (`suppliers:write`) link products on a supplier.

**How to use**

- Stock Movement: From / To (inclusive Asia/Jakarta days) + Type (IN / OUT / ADJ) + search/product. **Export CSV** uses those filters (`stock-movement.csv`).
- Petty cash ledger: **Edit** on a Top up row. Amount and note. If a later spend would overdraw, the save is rejected. Spends stay locked.
- Product detail: add/remove suppliers. Supplier detail/edit: add/remove products. On a new PR, an empty line supplier defaults to the first linked supplier; the dropdown still lists everyone.

### Added

- Stock movement CSV filtered by date and type (same filters as the list)
- Edit a posted petty-cash top-up (amount and note); later spends cannot overdraw
- Link products a supplier sells and suppliers of a product

---

## [0.6.0] - 2026-08-18

Small cash buys never went through a PR. The box is one running balance. Extra shop price comes from the box. Paying **less** than catalog does not put cash back — it writes a refund **audit** row (the unused budget never left).

**Who:** Admin and Finance top up. Only Admin buys stock with petty cash (`stock:write` + `pettyCash:write`). Fail if the box cannot cover amount paid. First top-up is the opening balance.

**Rules (locked)**

| Catalog total | Paid | Spend from box | Refund list |
| --- | --- | --- | --- |
| 100,000 | 80,000 | 80,000 | 20,000 (audit only) |
| 100,000 | 120,000 | 120,000 | none |
| 100,000 | 100,000 | 100,000 | none |

Buy creates: stock IN source `PETTY_CASH`, a `SPEND` of amount paid, and a `REFUND` if catalog × qty > paid. Optional actual unit price and “update catalog.” Catalog total uses the price **before** that update.

**Out of this release:** petty cash on PR goods receipt, approvals on top-ups/spends, GL, opening-balance wizard.

### Added

- Petty cash box with Admin/Finance top-up (one account, running balance)
- Buy stock with petty cash (amount paid vs catalog; extra spend comes from the box)
- Refund list when paid is less than catalog (does not change the balance)
- CSV export for stock movement and the refund list

---

## [0.5.4] - 2026-08-18

Receive qty used to pre-fill in a way that made it too easy to post more than the invoice still owed, or to treat every line as ready.

### Changed

- Receive qty defaults to the invoiced amount still due (`ordered − already received`)
- Stock-in is only via **Receive this item**, so other lines wait for later deliveries

---

## [0.5.3] - 2026-08-18

A truck that brings half a PR must not force the rest of the lines into stock.

### Changed

- Receive into stock per item so later deliveries can wait
- Purchase list shows **Partial** when only some lines are in stock

---

## [0.5.2] - 2026-08-18

PR create was free-text department/purpose and hand-typed numbers. Receipt had no per-line story.

### Added

- Department and purpose dropdowns on purchase request create
- Automatic PR numbers (`PR-YYYY-NNN`, year from request date, sequence per year)
- Per-line suppliers on a purchase request (header supplier still optional)
- Inventory last-in date from stock IN
- Goods receipt status per PR line and grouped by product type (category)

---

## [0.5.1] - 2026-08-17

List chrome for daily ops. Priority was noise on the purchase list.

### Added

- Demo login table with name, position, and password (only when `PUBLIC_SHOW_DEMO_LOGINS=true`)
- Purchase list agreement progress (e.g. 2/3 agreed)
- Purchase list purpose and stock-in / waiting status

### Removed

- Priority column and filter on the purchase request list

---

## [0.5.0] - 2026-08-17

Trust and daily UX. Chrome is Bahasa-first. Fake Settings Save and fake bell badge are gone. Pemohon is a requester, not a warehouse admin.

### Added

- Indonesian/English chrome copy with locale cookie (`casan-locale`) and role labels
- Persisted company settings (items per page; `settings:write` to save)
- Password change from the sidebar
- USER role as requester with suppliers nav hidden
- Role-based home dashboard (queue / my PRs / ops)
- In-app notification inbox on the bell (`PR_WAITING`, `PR_DECIDED`)
- Sortable purchasing and inventory tables
- Mobile cards on purchasing, inventory, and approvals lists
- Sidebar waiting-count badge and path-based navbar titles

### Changed

- Demo logins show only when `PUBLIC_SHOW_DEMO_LOGINS` is the string `true`
- Production build runs `prisma migrate deploy` so settings and notifications tables exist

### Fixed

- Stock ledger GET requires `stock:view`
- Purchase delete requires write permission and ADMIN or requester ownership
- Change-password updates only the password column

---

## [0.4.0] - 2026-07-28

### Added

- Status statistic tabs on Purchasing (Waiting / Approved / Unapproved) and Suppliers (by type)
- PR decision deadline (latest date to approve or reject)
- Overdue / due-soon highlights for pending PR decisions

---

## [0.3.0] - 2026-07-28

### Added

- My Approvals month filter with accepted / rejected counts
- Dashboard category stock analytics and product inventory table
- Automatic product codes on create
- Supplier type (manufacturer, distributor, etc.)
- Product photo upload and inventory thumbnails

---

## [0.2.1] - 2026-07-28

### Added

- Admin can approve/reject any pending level and reassign approvers
- Stock transaction detail page with PR link
- Reverse stock movement (audit-safe opposite transaction; original row is not deleted)
- Clearer “waiting on” approval guidance on PR detail
- Full demo account list on login

---

## [0.2.0] - 2026-07-28

Sequential approval and goods receipt become real. Product stock is no longer a typed field on edit.

### Added

- My Approvals inbox for assigned approvers
- Goods receipt against approved PR (updates stock)
- Role-based menus and API access
- Low-stock filter and Create PR from low stock
- Approval status filter on purchasing list
- Sequential approval (earlier levels must finish first)
- Clickable dashboard cards and approval/low-stock CTAs

### Changed

- Product stock is read-only on edit (use Stock Movement or Goods Receipt)
- Sidebar shows only menus allowed for the user role

---

## [0.1.0] - 2026-07-28

### Added

- Soft delete for products, suppliers, purchases, and users
- Product purchase price input
- Supplier list pagination
- Purchase request approval status column
- Approve / reject actions on PR detail
- Print view for PR list and PR detail
- Docker Compose setup for PostgreSQL

### Changed

- Approval column layout on PR print (row style)
- Dark / light mode color consistency

### Fixed

- Reject reason UI display on approval

---

## [0.0.1] - 2026-07-08

### Added

- Initial Casan ERP release
- Authentication and protected routes
- Dashboard, inventory, stock movement, suppliers, purchasing
- Settings and user management foundations
