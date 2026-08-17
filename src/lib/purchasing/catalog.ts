export const DEPARTMENTS = [
	'Operations',
	'Warehouse',
	'Purchasing',
	'IT',
	'Finance',
	'HR',
	'Sales'
] as const;

export const PURPOSES = [
	'Restock',
	'Operations',
	'Project',
	'Maintenance',
	'New equipment',
	'Event',
	'Office supplies',
	'Other'
] as const;

export type Department = (typeof DEPARTMENTS)[number];
export type Purpose = (typeof PURPOSES)[number];

export function isDepartment(value: string): value is Department {
	return (DEPARTMENTS as readonly string[]).includes(value);
}

export function isPurpose(value: string): value is Purpose {
	return (PURPOSES as readonly string[]).includes(value);
}

export function nextPrNumberFromLatest(latest: string | null, year: number): string {
	const prefix = `PR-${year}-`;
	if (!latest || !latest.startsWith(prefix)) return `${prefix}001`;
	const n = Number(latest.slice(prefix.length));
	const next = Number.isFinite(n) ? n + 1 : 1;
	return `${prefix}${String(next).padStart(3, '0')}`;
}

export function supplierNames(purchase: {
	supplier?: { name: string } | null;
	items?: { supplier?: { name: string } | null }[] | null;
}): string {
	const names = new Set<string>();
	if (purchase.supplier?.name) names.add(purchase.supplier.name);
	for (const item of purchase.items ?? []) {
		if (item.supplier?.name) names.add(item.supplier.name);
	}
	return [...names].join(', ') || '—';
}

export type ReceiveStatus = 'WAITING' | 'PARTIAL' | 'STOCK_IN';

export function lineReceiveStatus(orderedQty: number, receivedQty: number): ReceiveStatus {
	if (receivedQty <= 0) return 'WAITING';
	if (receivedQty >= orderedQty) return 'STOCK_IN';
	return 'PARTIAL';
}

export function allocateReceivedQty<T extends { productId: string; qty: number }>(
	items: T[],
	receivedByProduct: Record<string, number>
): (T & { receivedQty: number; remainingQty: number; status: ReceiveStatus })[] {
	const leftover: Record<string, number> = { ...receivedByProduct };
	return items.map((item) => {
		const available = leftover[item.productId] ?? 0;
		const receivedQty = Math.min(item.qty, Math.max(0, available));
		leftover[item.productId] = available - receivedQty;
		return {
			...item,
			receivedQty,
			remainingQty: Math.max(0, item.qty - receivedQty),
			status: lineReceiveStatus(item.qty, receivedQty)
		};
	});
}

export function groupByProductType<
	T extends { categoryName?: string | null; orderedQty: number; receivedQty: number }
>(lines: T[]) {
	const map = new Map<string, T[]>();
	for (const line of lines) {
		const key = line.categoryName?.trim() || 'Uncategorized';
		const list = map.get(key) ?? [];
		list.push(line);
		map.set(key, list);
	}
	return [...map.entries()].map(([category, groupLines]) => {
		const orderedQty = groupLines.reduce((sum, line) => sum + line.orderedQty, 0);
		const receivedQty = groupLines.reduce((sum, line) => sum + line.receivedQty, 0);
		return {
			category,
			lines: groupLines,
			orderedQty,
			receivedQty,
			status: lineReceiveStatus(orderedQty, receivedQty)
		};
	});
}
