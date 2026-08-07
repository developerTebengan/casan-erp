import type { UserRole } from '$lib/types';

export type AppPermission =
	| 'dashboard:view'
	| 'inventory:view'
	| 'inventory:write'
	| 'stock:view'
	| 'stock:write'
	| 'purchasing:view'
	| 'purchasing:write'
	| 'purchasing:receive'
	| 'approvals:view'
	| 'suppliers:view'
	| 'suppliers:write'
	| 'users:manage'
	| 'settings:view';

const ALL_ROLES: UserRole[] = [
	'ADMIN',
	'USER',
	'DEPARTMENT_HEAD',
	'FINANCE',
	'MANAGER',
	'DIRECTOR'
];

const ROLE_PERMISSIONS: Record<UserRole, AppPermission[]> = {
	ADMIN: [
		'dashboard:view',
		'inventory:view',
		'inventory:write',
		'stock:view',
		'stock:write',
		'purchasing:view',
		'purchasing:write',
		'purchasing:receive',
		'approvals:view',
		'suppliers:view',
		'suppliers:write',
		'users:manage',
		'settings:view'
	],
	USER: [
		'dashboard:view',
		'inventory:view',
		'inventory:write',
		'stock:view',
		'stock:write',
		'purchasing:view',
		'purchasing:write',
		'purchasing:receive',
		'suppliers:view',
		'suppliers:write',
		'settings:view'
	],
	DEPARTMENT_HEAD: [
		'dashboard:view',
		'inventory:view',
		'stock:view',
		'purchasing:view',
		'approvals:view',
		'suppliers:view',
		'settings:view'
	],
	FINANCE: [
		'dashboard:view',
		'inventory:view',
		'purchasing:view',
		'approvals:view',
		'suppliers:view',
		'suppliers:write',
		'settings:view'
	],
	MANAGER: [
		'dashboard:view',
		'inventory:view',
		'purchasing:view',
		'approvals:view',
		'suppliers:view',
		'settings:view'
	],
	DIRECTOR: [
		'dashboard:view',
		'inventory:view',
		'purchasing:view',
		'approvals:view',
		'suppliers:view',
		'settings:view'
	]
};

export function hasPermission(role: UserRole, permission: AppPermission): boolean {
	return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canAccessPath(role: UserRole, pathname: string): boolean {
	if (pathname.startsWith('/dashboard')) return hasPermission(role, 'dashboard:view');
	if (pathname.startsWith('/inventory')) return hasPermission(role, 'inventory:view');
	if (pathname.startsWith('/stock')) return hasPermission(role, 'stock:view');
	if (pathname.startsWith('/approvals')) return hasPermission(role, 'approvals:view');
	if (pathname.startsWith('/purchasing')) return hasPermission(role, 'purchasing:view');
	if (pathname.startsWith('/suppliers')) return hasPermission(role, 'suppliers:view');
	if (pathname.startsWith('/users')) return hasPermission(role, 'users:manage');
	if (pathname.startsWith('/settings')) return hasPermission(role, 'settings:view');
	return true;
}

export type NavItem = {
	label: string;
	href: string;
	permission: AppPermission;
};

export const NAV_ITEMS: NavItem[] = [
	{ label: 'Dashboard', href: '/dashboard', permission: 'dashboard:view' },
	{ label: 'Inventory', href: '/inventory', permission: 'inventory:view' },
	{ label: 'Stock Movement', href: '/stock', permission: 'stock:view' },
	{ label: 'My Approvals', href: '/approvals', permission: 'approvals:view' },
	{ label: 'Purchasing Request', href: '/purchasing', permission: 'purchasing:view' },
	{ label: 'Suppliers', href: '/suppliers', permission: 'suppliers:view' },
	{ label: 'Users', href: '/users', permission: 'users:manage' },
	{ label: 'Settings', href: '/settings', permission: 'settings:view' }
];

export function navItemsForRole(role: UserRole): NavItem[] {
	return NAV_ITEMS.filter((item) => hasPermission(role, item.permission));
}

export { ALL_ROLES, ROLE_PERMISSIONS };
