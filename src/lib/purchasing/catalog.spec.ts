import { describe, it, expect } from 'vitest';
import {
	allocateReceivedQty,
	groupByProductType,
	isDepartment,
	isPurpose,
	lineReceiveStatus,
	nextPrNumberFromLatest,
	supplierNames
} from './catalog';

describe('nextPrNumberFromLatest', () => {
	it('starts at 001 for a new year', () => {
		expect(nextPrNumberFromLatest(null, 2026)).toBe('PR-2026-001');
		expect(nextPrNumberFromLatest('PR-2025-099', 2026)).toBe('PR-2026-001');
	});

	it('increments a padded sequence', () => {
		expect(nextPrNumberFromLatest('PR-2026-020', 2026)).toBe('PR-2026-021');
	});
});

describe('catalog guards', () => {
	it('accepts known departments and purposes', () => {
		expect(isDepartment('Operations')).toBe(true);
		expect(isDepartment('Legal')).toBe(false);
		expect(isPurpose('Restock')).toBe(true);
		expect(isPurpose('Whatever')).toBe(false);
	});
});

describe('supplierNames', () => {
	it('joins unique header and line suppliers', () => {
		expect(
			supplierNames({
				supplier: { name: 'PT A' },
				items: [{ supplier: { name: 'PT A' } }, { supplier: { name: 'Toko B' } }]
			})
		).toBe('PT A, Toko B');
	});
});

describe('lineReceiveStatus', () => {
	it('maps received qty to waiting / partial / stock in', () => {
		expect(lineReceiveStatus(10, 0)).toBe('WAITING');
		expect(lineReceiveStatus(10, 4)).toBe('PARTIAL');
		expect(lineReceiveStatus(10, 10)).toBe('STOCK_IN');
	});
});

describe('allocateReceivedQty', () => {
	it('assigns received qty to lines of the same product in order', () => {
		const rows = allocateReceivedQty(
			[
				{ productId: 'a', qty: 4 },
				{ productId: 'a', qty: 6 },
				{ productId: 'b', qty: 2 }
			],
			{ a: 5, b: 2 }
		);
		expect(rows.map((row) => row.status)).toEqual(['STOCK_IN', 'PARTIAL', 'STOCK_IN']);
		expect(rows.map((row) => row.receivedQty)).toEqual([4, 1, 2]);
	});
});

describe('groupByProductType', () => {
	it('rolls up receive status per product type', () => {
		const groups = groupByProductType([
			{ categoryName: 'Spare parts', orderedQty: 4, receivedQty: 4 },
			{ categoryName: 'Spare parts', orderedQty: 2, receivedQty: 0 },
			{ categoryName: 'Office', orderedQty: 1, receivedQty: 0 }
		]);
		expect(groups).toEqual([
			{
				category: 'Spare parts',
				orderedQty: 6,
				receivedQty: 4,
				status: 'PARTIAL',
				lines: [
					{ categoryName: 'Spare parts', orderedQty: 4, receivedQty: 4 },
					{ categoryName: 'Spare parts', orderedQty: 2, receivedQty: 0 }
				]
			},
			{
				category: 'Office',
				orderedQty: 1,
				receivedQty: 0,
				status: 'WAITING',
				lines: [{ categoryName: 'Office', orderedQty: 1, receivedQty: 0 }]
			}
		]);
	});
});
