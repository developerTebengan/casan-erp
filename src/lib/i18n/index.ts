import type { UserRole } from '$lib/types';
import { id } from './id';
import { en } from './en';

export type Locale = 'id' | 'en';
const dict: Record<Locale, Record<string, string>> = { id, en };

export function parseLocale(value: string | undefined | null): Locale {
	return value === 'en' ? 'en' : 'id';
}

export function t(key: string, locale: Locale, vars?: Record<string, string | number>): string {
	const raw = dict[locale][key] ?? dict.id[key] ?? key;
	if (!vars) return raw;
	return raw.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}

export function roleLabel(role: UserRole, locale: Locale): string {
	return t(`role.${role}`, locale);
}

export function pageTitleKey(pathname: string): string {
	if (pathname.startsWith('/inventory')) return 'page.inventory';
	if (pathname.startsWith('/stock')) return 'page.stock';
	if (pathname.startsWith('/approvals')) return 'page.approvals';
	if (pathname.startsWith('/purchasing')) return 'page.purchasing';
	if (pathname.startsWith('/suppliers')) return 'page.suppliers';
	if (pathname.startsWith('/users')) return 'page.users';
	if (pathname.startsWith('/petty-cash')) return 'page.pettyCash';
	if (pathname.startsWith('/settings')) return 'page.settings';
	return 'page.dashboard';
}
