import { describe, it, expect } from 'vitest';
import { validateSettings } from './settings.service';

describe('validateSettings', () => {
	it('rejects empty company name and bad page size', () => {
		const result = validateSettings({ companyName: '', itemsPerPage: 7 });
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.errors.companyName).toBeTruthy();
			expect(result.errors.itemsPerPage).toBeTruthy();
		}
	});

	it('accepts 10/25/50', () => {
		const result = validateSettings({
			companyName: 'Casan',
			email: 'a@b.c',
			phone: '1',
			taxId: '1',
			address: 'x',
			currency: 'IDR',
			dateFormat: 'DD/MM/YYYY',
			itemsPerPage: 25
		});
		expect(result.valid).toBe(true);
	});
});
