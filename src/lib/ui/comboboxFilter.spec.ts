import { describe, it, expect } from 'vitest';
import { filterOptions } from './comboboxFilter';

const options = [
	{ value: '1', label: 'P001 — Laptop ASUS' },
	{ value: '2', label: 'P002 — Cable 16A' },
	{ value: '3', label: 'Toko Maju' }
];

describe('filterOptions', () => {
	it('matches code or name case-insensitively', () => {
		expect(filterOptions(options, 'p001').map((o) => o.value)).toEqual(['1']);
		expect(filterOptions(options, 'cable').map((o) => o.value)).toEqual(['2']);
		expect(filterOptions(options, 'TOKO').map((o) => o.value)).toEqual(['3']);
	});

	it('returns all options when the query is empty', () => {
		expect(filterOptions(options, '  ')).toHaveLength(3);
	});
});
