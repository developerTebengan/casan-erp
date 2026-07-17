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
