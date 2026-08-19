import { roundMoney } from '$lib/petty-cash/variance';

export const NONE_SUPPLIER_KEY = 'none';

export function supplierKey(supplierId: string | null | undefined): string {
	return supplierId ? String(supplierId) : NONE_SUPPLIER_KEY;
}

export function settlementBill(
	actualGoods: number,
	tax: number,
	delivery: number,
	other: number
): number {
	return roundMoney(actualGoods) + roundMoney(tax) + roundMoney(delivery) + roundMoney(other);
}

export function leftover(prTotal: number, bill: number): number {
	return roundMoney(Math.max(0, roundMoney(prTotal) - bill));
}

export function canSubmitRefundRequest(leftoverAmount: number): boolean {
	return leftoverAmount > 0;
}

export function prTotalForSupplier(
	items: Array<{ supplierId?: string | null; qty: number; price: number }>,
	key: string
): number {
	return roundMoney(
		items
			.filter((item) => supplierKey(item.supplierId) === key)
			.reduce((sum, item) => sum + Number(item.qty) * Number(item.price), 0)
	);
}

export function supplierKeysFromItems(
	items: Array<{ supplierId?: string | null }>
): string[] {
	const seen = new Set<string>();
	const keys: string[] = [];
	for (const item of items) {
		const key = supplierKey(item.supplierId);
		if (!seen.has(key)) {
			seen.add(key);
			keys.push(key);
		}
	}
	return keys;
}
