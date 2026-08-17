import { describe, it, expect } from 'vitest';
import { hasPermission, navItemsForRole, canAccessPath } from './permissions';

describe('USER permissions', () => {
	it('cannot write stock, inventory, receive, or settings', () => {
		expect(hasPermission('USER', 'inventory:write')).toBe(false);
		expect(hasPermission('USER', 'stock:view')).toBe(false);
		expect(hasPermission('USER', 'purchasing:receive')).toBe(false);
		expect(hasPermission('USER', 'suppliers:write')).toBe(false);
		expect(hasPermission('USER', 'settings:write')).toBe(false);
		expect(hasPermission('USER', 'purchasing:write')).toBe(true);
		expect(hasPermission('USER', 'suppliers:view')).toBe(true);
	});

	it('hides stock and suppliers from USER nav', () => {
		const hrefs = navItemsForRole('USER').map((i) => i.href);
		expect(hrefs).not.toContain('/stock');
		expect(hrefs).not.toContain('/suppliers');
		expect(hrefs).toContain('/purchasing');
		expect(hrefs).toContain('/inventory');
	});

	it('blocks /stock for USER', () => {
		expect(canAccessPath('USER', '/stock')).toBe(false);
	});
});
