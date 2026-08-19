import { describe, it, expect } from 'vitest';
import {
	canSubmitRefundRequest,
	leftover,
	prTotalForSupplier,
	settlementBill,
	supplierKey,
	supplierKeysFromItems
} from './settlement';

const items = [
	{ supplierId: 's1', qty: 2, price: 50_000 },
	{ supplierId: 's1', qty: 1, price: 20_000 },
	{ supplierId: 's2', qty: 1, price: 10_000 },
	{ supplierId: null, qty: 1, price: 5_000 }
];

describe('supplier settlement math', () => {
	it('uses full PR line totals for that supplier', () => {
		expect(prTotalForSupplier(items, 's1')).toBe(120_000);
		expect(supplierKey(null)).toBe('none');
		expect(prTotalForSupplier(items, 'none')).toBe(5_000);
		expect(supplierKeysFromItems(items)).toEqual(['s1', 's2', 'none']);
	});

	it('leftover is PR total minus goods minus extras; overspend is zero leftover', () => {
		const bill = settlementBill(80_000, 5_000, 10_000, 0);
		expect(bill).toBe(95_000);
		expect(leftover(120_000, bill)).toBe(25_000);
		expect(canSubmitRefundRequest(25_000)).toBe(true);
		expect(leftover(100_000, settlementBill(90_000, 20_000, 0, 0))).toBe(0);
		expect(canSubmitRefundRequest(0)).toBe(false);
	});
});
