export function formatCurrency(value: number): string {
	return new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency: 'IDR',
		minimumFractionDigits: 0
	}).format(value);
}

export function formatNumber(value: number): string {
	return new Intl.NumberFormat('id-ID').format(value);
}

/** Parse user-typed id-ID numbers (e.g. "45.000" or "1.234.567"). */
export function parseIdNumber(raw: string | number | null | undefined): number {
	if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
	const cleaned = String(raw ?? '')
		.replace(/\./g, '')
		.replace(/,/g, '')
		.trim();
	if (!cleaned) return 0;
	const n = Number(cleaned);
	return Number.isFinite(n) ? n : 0;
}

export function formatDate(date: string | Date): string {
	return new Intl.DateTimeFormat('id-ID', {
		day: '2-digit',
		month: 'short',
		year: 'numeric'
	}).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
	return new Intl.DateTimeFormat('id-ID', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	}).format(new Date(date));
}

export function classNames(...classes: (string | false | null | undefined)[]): string {
	return classes.filter(Boolean).join(' ');
}
