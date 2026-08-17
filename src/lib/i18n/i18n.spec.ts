import { describe, it, expect } from 'vitest';
import { NAV_ITEMS } from '../permissions';
import { t, roleLabel, parseLocale } from './index';

describe('i18n', () => {
	it('parses locale with id default', () => {
		expect(parseLocale(null)).toBe('id');
		expect(parseLocale('en')).toBe('en');
		expect(parseLocale('fr')).toBe('id');
	});

	it('interpolates and falls back to id then key', () => {
		expect(t('notify.waiting', 'id', { prNumber: 'PR-1' })).toContain('PR-1');
		expect(t('notify.waiting', 'en', { prNumber: 'PR-1' })).toContain('PR-1');
		expect(t('does.not.exist', 'en')).toBe('does.not.exist');
	});

	it('never returns raw role enums', () => {
		expect(roleLabel('DEPARTMENT_HEAD', 'id')).toBe('Kepala Departemen');
		expect(roleLabel('DEPARTMENT_HEAD', 'en')).toBe('Department Head');
		expect(roleLabel('USER', 'id')).toBe('Pemohon');
		expect(roleLabel('USER', 'en')).toBe('Requester');
	});

	it('resolves every nav labelKey', () => {
		expect(NAV_ITEMS.map((item) => item.labelKey)).toEqual([
			'nav.dashboard',
			'nav.inventory',
			'nav.stock',
			'nav.approvals',
			'nav.purchasing',
			'nav.suppliers',
			'nav.users',
			'nav.settings'
		]);
		for (const item of NAV_ITEMS) {
			expect(t(item.labelKey, 'id')).not.toBe(item.labelKey);
			expect(t(item.labelKey, 'en')).not.toBe(item.labelKey);
		}
	});

	it('translates dashboard status and ops labels', () => {
		expect(t('dash.status.approved', 'id')).toBe('Disetujui');
		expect(t('dash.status.approved', 'en')).toBe('Approved');
		expect(t('dash.status.rejected', 'id')).toBe('Ditolak');
		expect(t('dash.status.rejected', 'en')).toBe('Rejected');
		expect(t('dash.status.waiting', 'id')).toBe('Menunggu');
		expect(t('dash.status.waiting', 'en')).toBe('Waiting');
		expect(t('dash.ops.pending', 'id')).toBe('Menunggu');
		expect(t('dash.ops.pending', 'en')).toBe('Pending');
	});

	it('translates login and logout chrome', () => {
		expect(t('page.login', 'id')).toBe('Masuk');
		expect(t('page.login', 'en')).toBe('Login');
		expect(t('auth.signIn', 'id')).toBe('Masuk');
		expect(t('auth.signIn', 'en')).toBe('Sign in');
		expect(t('auth.demoTitle', 'id')).toBe('Akun demo');
		expect(t('auth.demoTitle', 'en')).toBe('Demo accounts');
		expect(t('common.logout', 'id')).toBe('Keluar');
		expect(t('common.logout', 'en')).toBe('Log out');
	});
});
