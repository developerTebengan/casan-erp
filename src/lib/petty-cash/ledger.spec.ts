import { describe, it, expect } from 'vitest';
import { applyTopUpEdit } from './ledger';

const rows = [
	{ id: 't1', type: 'TOP_UP' as const, amount: 1_000_000 },
	{ id: 's1', type: 'SPEND' as const, amount: 800_000 },
	{ id: 'r1', type: 'REFUND' as const, amount: 20_000 },
	{ id: 't2', type: 'TOP_UP' as const, amount: 100_000 }
];

describe('applyTopUpEdit', () => {
	it('replays balances after a top-up amount change', () => {
		const result = applyTopUpEdit(rows, 't1', 900_000);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.balance).toBe(200_000);
		expect(result.rows.find((r) => r.id === 't1')?.balanceAfter).toBe(900_000);
		expect(result.rows.find((r) => r.id === 's1')?.balanceAfter).toBe(100_000);
		expect(result.rows.find((r) => r.id === 'r1')?.balanceAfter).toBe(100_000);
		expect(result.rows.find((r) => r.id === 't2')?.balanceAfter).toBe(200_000);
	});

	it('rejects an edit that would make a later spend overdraw', () => {
		const result = applyTopUpEdit(rows, 't1', 500_000);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error).toMatch(/spend/i);
	});

	it('rejects editing a spend', () => {
		const result = applyTopUpEdit(rows, 's1', 100);
		expect(result.ok).toBe(false);
	});

	it('rejects a non-positive top-up amount', () => {
		expect(applyTopUpEdit(rows, 't1', 0).ok).toBe(false);
	});
});
