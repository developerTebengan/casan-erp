export const APP_VERSION = '0.6.2';
export const APP_NAME = 'Casan ERP';

export type ChangelogChangeType = 'added' | 'changed' | 'fixed' | 'removed';

export interface ChangelogEntry {
	version: string;
	date: string;
	changes: {
		type: ChangelogChangeType;
		items: string[];
	}[];
}

export const CHANGELOG: ChangelogEntry[] = [
	{
		version: '0.6.2',
		date: '2026-08-19',
		changes: [
			{
				type: 'added',
				items: [
					'Petty cash ledger date/type filter and CSV export of the current view',
					'Buy with petty cash button on Kas kecil (Admin; needs stock:write)',
					'Amount paid on a petty-cash buy starts at catalog total; a custom amount is kept if you already typed one'
				]
			}
		]
	},
	{
		version: '0.6.1',
		date: '2026-08-18',
		changes: [
			{
				type: 'added',
				items: [
					'Stock movement CSV filtered by date and type (same filters as the list)',
					'Edit a posted petty-cash top-up (amount and note); later spends cannot overdraw',
					'Link products a supplier sells and suppliers of a product'
				]
			}
		]
	},
	{
		version: '0.6.0',
		date: '2026-08-18',
		changes: [
			{
				type: 'added',
				items: [
					'Petty cash box with Admin/Finance top-up (one account, running balance)',
					'Buy stock with petty cash (amount paid vs catalog; extra spend comes from the box)',
					'Refund list when paid is less than catalog (does not change the balance)',
					'CSV export for stock movement and the refund list'
				]
			}
		]
	},
	{
		version: '0.5.4',
		date: '2026-08-18',
		changes: [
			{
				type: 'changed',
				items: [
					'Receive qty defaults to the invoiced amount still due',
					'Stock-in is only via Receive this item, so other lines wait'
				]
			}
		]
	},
	{
		version: '0.5.3',
		date: '2026-08-18',
		changes: [
			{
				type: 'changed',
				items: [
					'Receive into stock per item so later deliveries can wait',
					'Purchase list shows Partial when only some lines are in stock'
				]
			}
		]
	},
	{
		version: '0.5.2',
		date: '2026-08-18',
		changes: [
			{
				type: 'added',
				items: [
					'Department and purpose dropdowns on purchase request create',
					'Automatic PR numbers (PR-YYYY-NNN)',
					'Per-line suppliers on a purchase request',
					'Inventory last-in date',
					'Goods receipt status per PR line and per product type'
				]
			}
		]
	},
	{
		version: '0.5.1',
		date: '2026-08-17',
		changes: [
			{
				type: 'added',
				items: [
					'Demo login table with name, position, and password',
					'Purchase list agreement progress (e.g. 2/3 agreed)',
					'Purchase list purpose and stock-in / waiting status'
				]
			},
			{
				type: 'removed',
				items: ['Priority column and filter on the purchase request list']
			}
		]
	},
	{
		version: '0.5.0',
		date: '2026-08-17',
		changes: [
			{
				type: 'added',
				items: [
					'Indonesian/English chrome copy with locale cookie and role labels',
					'Persisted company settings (items per page, settings:write)',
					'Password change from the sidebar',
					'USER role as requester with suppliers nav hidden',
					'Role-based home dashboard',
					'In-app notification inbox on the bell',
					'Sortable purchasing and inventory tables',
					'Mobile cards on purchasing, inventory, and approvals lists',
					'Sidebar waiting-count badge and path-based navbar titles'
				]
			},
			{
				type: 'changed',
				items: [
					'Demo logins show only when PUBLIC_SHOW_DEMO_LOGINS is the string true',
					'Production build runs prisma migrate deploy so settings and notifications tables exist'
				]
			},
			{
				type: 'fixed',
				items: [
					'Stock ledger GET requires stock:view',
					'Purchase delete requires write permission and ADMIN or requester ownership',
					'Change-password updates only the password column'
				]
			}
		]
	},
	{
		version: '0.4.0',
		date: '2026-07-28',
		changes: [
			{
				type: 'added',
				items: [
					'Status statistic tabs on Purchasing (Waiting / Approved / Unapproved) and Suppliers (by type)',
					'PR decision deadline (latest date to approve or reject)',
					'Overdue / due-soon highlights for pending PR decisions'
				]
			}
		]
	},
	{
		version: '0.3.0',
		date: '2026-07-28',
		changes: [
			{
				type: 'added',
				items: [
					'My Approvals month filter with accepted / rejected counts',
					'Dashboard category stock analytics and product inventory table',
					'Automatic product codes on create',
					'Supplier type (manufacturer, distributor, etc.)',
					'Product photo upload and inventory thumbnails'
				]
			}
		]
	},
	{
		version: '0.2.1',
		date: '2026-07-28',
		changes: [
			{
				type: 'added',
				items: [
					'Admin can approve/reject any pending level and reassign approvers',
					'Stock transaction detail page with PR link',
					'Reverse stock movement (audit-safe opposite transaction)',
					'Clearer “waiting on” approval guidance on PR detail',
					'Full demo account list on login'
				]
			}
		]
	},
	{
		version: '0.2.0',
		date: '2026-07-28',
		changes: [
			{
				type: 'added',
				items: [
					'My Approvals inbox for assigned approvers',
					'Goods receipt against approved PR (updates stock)',
					'Role-based menus and API access',
					'Low-stock filter and Create PR from low stock',
					'Approval status filter on purchasing list',
					'Sequential approval (earlier levels must finish first)',
					'Clickable dashboard cards and approval/low-stock CTAs'
				]
			},
			{
				type: 'changed',
				items: [
					'Product stock is read-only on edit (use Stock Movement or Goods Receipt)',
					'Sidebar shows only menus allowed for the user role'
				]
			}
		]
	},
	{
		version: '0.1.0',
		date: '2026-07-28',
		changes: [
			{
				type: 'added',
				items: [
					'Soft delete for products, suppliers, purchases, and users',
					'Product purchase price input',
					'Supplier list pagination',
					'Purchase request approval status column',
					'Approve / reject actions on PR detail',
					'Print view for PR list and PR detail',
					'Docker Compose setup for PostgreSQL'
				]
			},
			{
				type: 'changed',
				items: [
					'Approval column layout on PR print (row style)',
					'Dark / light mode color consistency'
				]
			},
			{
				type: 'fixed',
				items: ['Reject reason UI display on approval']
			}
		]
	},
	{
		version: '0.0.1',
		date: '2026-07-08',
		changes: [
			{
				type: 'added',
				items: [
					'Initial Casan ERP release',
					'Authentication and protected routes',
					'Dashboard, inventory, stock movement, suppliers, purchasing',
					'Settings and user management foundations'
				]
			}
		]
	}
];

export const CHANGE_TYPE_LABEL: Record<ChangelogChangeType, string> = {
	added: 'Added',
	changed: 'Changed',
	fixed: 'Fixed',
	removed: 'Removed'
};
