import { describe, it, expect } from 'vitest';
import { isManualSourceOfFund, ledgerInOut } from './sourceOfFund';

describe('source of fund and ledger columns', () => {
	it('requires a manual source on a typed top-up, not PR leftover', () => {
		expect(isManualSourceOfFund('CASH')).toBe(true);
		expect(isManualSourceOfFund('PR_LEFTOVER')).toBe(false);
		expect(isManualSourceOfFund('')).toBe(false);
	});

	it('puts top-up in In, spend in Out, refund and transfer in neither', () => {
		expect(ledgerInOut('TOP_UP', 10)).toEqual({ inn: 10, out: null });
		expect(ledgerInOut('SPEND', 10)).toEqual({ inn: null, out: 10 });
		expect(ledgerInOut('REFUND', 10)).toEqual({ inn: null, out: null });
		expect(ledgerInOut('TRANSFER', 10)).toEqual({ inn: null, out: null });
	});
});
