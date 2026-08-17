# Changelog

All notable changes to Casan ERP are documented here.

## [0.5.4] - 2026-08-18

### Changed
- Receive qty defaults to the invoiced amount still due
- Stock-in is only via Receive this item, so other lines wait

## [0.5.3] - 2026-08-18

### Changed
- Receive into stock per item so later deliveries can wait
- Purchase list shows Partial when only some lines are in stock

## [0.5.2] - 2026-08-18

### Added
- Department and purpose dropdowns on purchase request create
- Automatic PR numbers (`PR-YYYY-NNN`)
- Per-line suppliers on a purchase request
- Inventory last-in date
- Goods receipt status per PR line and per product type

## [0.5.1] - 2026-08-17

### Added
- Demo login table with name, position, and password
- Purchase list agreement progress (e.g. 2/3 agreed)
- Purchase list purpose and stock-in / waiting status

### Removed
- Priority column and filter on the purchase request list

## [0.5.0] - 2026-08-17

### Added
- Indonesian/English chrome copy with locale cookie and role labels
- Persisted company settings (items per page, settings:write)
- Password change from the sidebar
- USER role as requester with suppliers nav hidden
- Role-based home dashboard
- In-app notification inbox on the bell
- Sortable purchasing and inventory tables
- Mobile cards on purchasing, inventory, and approvals lists
- Sidebar waiting-count badge and path-based navbar titles

### Changed
- Demo logins show only when PUBLIC_SHOW_DEMO_LOGINS is the string `true`
- Production build runs `prisma migrate deploy` so settings and notifications tables exist

### Fixed
- Stock ledger GET requires `stock:view`
- Purchase delete requires write permission and ADMIN or requester ownership
- Change-password updates only the password column

## [0.4.0] - 2026-07-28

### Added
- Status statistic tabs on Purchasing (Waiting / Approved / Unapproved) and Suppliers (by type)
- PR decision deadline (latest date to approve or reject)
- Overdue / due-soon highlights for pending PR decisions

## [0.3.0] - 2026-07-28

### Added
- My Approvals month filter with accepted / rejected counts
- Dashboard category stock analytics and product inventory table
- Automatic product codes on create
- Supplier type (manufacturer, distributor, etc.)
- Product photo upload and inventory thumbnails

## [0.2.1] - 2026-07-28

### Added
- Admin can approve/reject any pending level and reassign approvers
- Stock transaction detail page with PR link
- Reverse stock movement (audit-safe opposite transaction)
- Clearer “waiting on” approval guidance on PR detail
- Full demo account list on login

## [0.2.0] - 2026-07-28

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

## [0.0.1] - 2026-07-08

### Added
- Initial Casan ERP release
- Authentication and protected routes
- Dashboard, inventory, stock movement, suppliers, purchasing
- Settings and user management foundations
