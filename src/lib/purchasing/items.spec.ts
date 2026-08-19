import { describe, it, expect } from 'vitest';
import { parsePurchaseItems } from './items';

describe('parsePurchaseItems', () => {
	it('requires a supplier on every line', () => {
		const result = parsePurchaseItems([
			{ productId: 'p1', qty: 1, price: 10, supplierId: '' }
		]);
		expect(result.valid).toBe(false);
		if (result.valid) return;
		expect(result.errors).toMatch(/supplier/i);
	});

	it('accepts lines with product, qty, price, and supplier', () => {
		const result = parsePurchaseItems([
			{ productId: 'p1', qty: 2, price: 50, supplierId: 's1', notes: 'n' }
		]);
		expect(result.valid).toBe(true);
		if (!result.valid) return;
		expect(result.data[0]).toEqual({
			productId: 'p1',
			qty: 2,
			price: 50,
			notes: 'n',
			supplierId: 's1'
		});
	});
});
