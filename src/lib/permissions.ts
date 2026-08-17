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
	| 'settings:view'
	| 'settings:write';

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
		'settings:view',
		'settings:write'
	],
	USER: [
		'dashboard:view',
		'inventory:view',
		'purchasing:view',
		'purchasing:write',
		'suppliers:view',
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
	labelKey: string;
	href: string;
	permission: AppPermission;
};

export const NAV_ITEMS: NavItem[] = [
	{ labelKey: 'nav.dashboard', href: '/dashboard', permission: 'dashboard:view' },
	{ labelKey: 'nav.inventory', href: '/inventory', permission: 'inventory:view' },
	{ labelKey: 'nav.stock', href: '/stock', permission: 'stock:view' },
	{ labelKey: 'nav.approvals', href: '/approvals', permission: 'approvals:view' },
	{ labelKey: 'nav.purchasing', href: '/purchasing', permission: 'purchasing:view' },
	{ labelKey: 'nav.suppliers', href: '/suppliers', permission: 'suppliers:view' },
	{ labelKey: 'nav.users', href: '/users', permission: 'users:manage' },
	{ labelKey: 'nav.settings', href: '/settings', permission: 'settings:view' }
];

export function navItemsForRole(role: UserRole): NavItem[] {
	return NAV_ITEMS.filter((item) => {
		if (item.href === '/suppliers' && role === 'USER') return false;
		return hasPermission(role, item.permission);
	});
}

export { ALL_ROLES, ROLE_PERMISSIONS };
