import { describe, it, expect } from 'vitest';
import { catalogTotal, extraSpend, varianceRefund } from './variance';

describe('petty cash variance', () => {
	it('refunds unused catalog budget when paid is less', () => {
		expect(catalogTotal(50_000, 2)).toBe(100_000);
		expect(varianceRefund(100_000, 80_000)).toBe(20_000);
		expect(extraSpend(100_000, 80_000)).toBe(0);
	});

	it('records extra spend when paid is more, with no refund', () => {
		expect(varianceRefund(100_000, 120_000)).toBe(0);
		expect(extraSpend(100_000, 120_000)).toBe(20_000);
	});

	it('is a wash when paid matches catalog', () => {
		expect(varianceRefund(100_000, 100_000)).toBe(0);
		expect(extraSpend(100_000, 100_000)).toBe(0);
	});
});
