import { describe, expect, it } from 'vitest';
import { basketCheckoutAllowed, computeBasketTotals, type BasketLineDisplay } from './basket';

describe('petty cash basket totals', () => {
	it('computes totals, refund, extra and after-checkout', () => {
		const lines: BasketLineDisplay[] = [
			{
				line: {
					productId: 'p1',
					supplierId: 's1',
					qty: 2,
					paidAmount: 18000,
					actualUnitPrice: null,
					updateCatalogPrice: false,
					note: null
				},
				catalogUnitPrice: 10000
			},
			{
				line: {
					productId: 'p2',
					supplierId: 's2',
					qty: 1,
					paidAmount: 7000,
					actualUnitPrice: null,
					updateCatalogPrice: false,
					note: null
				},
				catalogUnitPrice: 5000
			}
		];

		// line1 catalog = 20,000; paid 18,000 => refund 2,000
		// line2 catalog = 5,000; paid 7,000 => extra 2,000
		// paid total = 25,000
		// refund total = 2,000; extra total = 2,000
		const totals = computeBasketTotals(lines, 40000);

		expect(totals).toEqual({
			catalogTotal: 25000,
			paidTotal: 25000,
			refundTotal: 2000,
			extraTotal: 2000,
			afterCheckout: 15000
		});
		expect(basketCheckoutAllowed(lines, 40000)).toBe(true);
		expect(basketCheckoutAllowed(lines, 20000)).toBe(false);
	});
});

