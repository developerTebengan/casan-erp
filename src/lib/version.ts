export const APP_VERSION = '0.3.0';
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
