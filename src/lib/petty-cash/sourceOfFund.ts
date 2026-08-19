export const SOURCE_OF_FUND = [
	'CASH',
	'BANK_TRANSFER',
	'DIRECTOR',
	'REVENUE',
	'OTHER',
	'PR_LEFTOVER'
] as const;

export type SourceOfFund = (typeof SOURCE_OF_FUND)[number];

export const MANUAL_SOURCES = SOURCE_OF_FUND.filter((s) => s !== 'PR_LEFTOVER');

export function isSourceOfFund(value: unknown): value is SourceOfFund {
	return SOURCE_OF_FUND.includes(String(value) as SourceOfFund);
}

export function isManualSourceOfFund(value: unknown): boolean {
	return MANUAL_SOURCES.includes(String(value) as (typeof MANUAL_SOURCES)[number]);
}

export function sourceOfFundLabel(value: string | null | undefined): string {
	if (!value) return '—';
	const labels: Record<SourceOfFund, string> = {
		CASH: 'Tunai',
		BANK_TRANSFER: 'Transfer bank',
		DIRECTOR: 'Direktur',
		REVENUE: 'Pendapatan',
		OTHER: 'Lainnya',
		PR_LEFTOVER: 'PR leftover'
	};
	return labels[value as SourceOfFund] ?? value;
}

export function ledgerInOut(
	type: string,
	amount: number
): { inn: number | null; out: number | null } {
	if (type === 'TOP_UP') return { inn: amount, out: null };
	if (type === 'SPEND') return { inn: null, out: amount };
	return { inn: null, out: null };
}
