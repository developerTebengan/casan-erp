import { describe, it, expect } from 'vitest';
import {
	actualExtras,
	approvedGrand,
	capRefundAmount,
	leftoverFromPr,
	lineGoodsTotal
} from './leftover';

describe('PR leftover v0.8', () => {
	it('includes header fees in approved grand total', () => {
		const lines = lineGoodsTotal([
			{ qty: 2, price: 50_000 },
			{ qty: 1, price: 20_000 }
		]);
		expect(lines).toBe(120_000);
		expect(approvedGrand(lines, 10_000, 5_000, 2_000)).toBe(137_000);
	});

	it('uses header extras until actuals are saved; leftover is grand minus actuals', () => {
		const grand = 137_000;
		const extrasUnset = actualExtras({
			tax: 10_000,
			shipping: 5_000,
			otherFees: 2_000
		});
		expect(extrasUnset).toBe(17_000);
		expect(leftoverFromPr(grand, 100_000, extrasUnset)).toBe(20_000);

		const extrasActual = actualExtras({
			tax: 10_000,
			shipping: 5_000,
			otherFees: 2_000,
			actualTax: 8_000,
			actualShipping: 4_000,
			actualOtherFees: 0
		});
		expect(extrasActual).toBe(12_000);
		expect(leftoverFromPr(grand, 100_000, extrasActual)).toBe(25_000);
	});

	it('is zero leftover on overspend', () => {
		expect(leftoverFromPr(100_000, 90_000, 20_000)).toBe(0);
	});

	it('caps a new refund at leftover and rejects zero or over', () => {
		expect(capRefundAmount(10_000, 20_000)).toBe(10_000);
		expect(capRefundAmount(20_000, 20_000)).toBe(20_000);
		expect(capRefundAmount(21_000, 20_000)).toBe(null);
		expect(capRefundAmount(0, 20_000)).toBe(null);
	});
});
