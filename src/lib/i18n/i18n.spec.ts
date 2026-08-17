import { describe, it, expect } from 'vitest';
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
	});
});
