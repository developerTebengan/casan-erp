import { roundMoney } from './variance';

export type LedgerType = 'TOP_UP' | 'SPEND' | 'REFUND';

export interface LedgerRow {
	id: string;
	type: LedgerType;
	amount: number;
}

export type ApplyTopUpEditResult =
	| { ok: true; balance: number; rows: Array<LedgerRow & { balanceAfter: number }> }
	| { ok: false; error: string };

export function applyTopUpEdit(
	rows: LedgerRow[],
	id: string,
	nextAmount: number
): ApplyTopUpEditResult {
	const target = rows.find((row) => row.id === id);
	if (!target) return { ok: false, error: 'Top-up not found' };
	if (target.type !== 'TOP_UP') return { ok: false, error: 'Only a top-up can be edited' };
	const amount = roundMoney(nextAmount);
	if (!(amount > 0)) return { ok: false, error: 'Amount must be greater than 0' };

	let balance = 0;
	const next: Array<LedgerRow & { balanceAfter: number }> = [];
	for (const row of rows) {
		const rowAmount = row.id === id ? amount : row.amount;
		if (row.type === 'TOP_UP') {
			balance += rowAmount;
		} else if (row.type === 'SPEND') {
			if (rowAmount > balance) {
				return { ok: false, error: 'This amount would leave too little for a later spend' };
			}
			balance -= rowAmount;
		}
		next.push({ ...row, amount: rowAmount, balanceAfter: balance });
	}

	return { ok: true, balance, rows: next };
}
