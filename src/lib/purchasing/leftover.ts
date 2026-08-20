import { roundMoney } from '$lib/petty-cash/variance';

export function lineGoodsTotal(
	items: Array<{ qty: number; price: number }>
): number {
	return roundMoney(items.reduce((sum, item) => sum + Number(item.qty) * Number(item.price), 0));
}

export function approvedGrand(
	lineTotal: number,
	tax: number,
	shipping: number,
	otherFees: number
): number {
	return roundMoney(lineTotal) + roundMoney(tax) + roundMoney(shipping) + roundMoney(otherFees);
}

export function coalesceExtras(
	actual: number | null | undefined,
	estimate: number
): number {
	return actual == null ? roundMoney(estimate) : roundMoney(actual);
}

export function actualExtras(input: {
	tax: number;
	shipping: number;
	otherFees: number;
	actualTax?: number | null;
	actualShipping?: number | null;
	actualOtherFees?: number | null;
}): number {
	return (
		coalesceExtras(input.actualTax, input.tax) +
		coalesceExtras(input.actualShipping, input.shipping) +
		coalesceExtras(input.actualOtherFees, input.otherFees)
	);
}

export function leftoverFromPr(approvedGrandTotal: number, actualGoods: number, extras: number): number {
	return roundMoney(Math.max(0, roundMoney(approvedGrandTotal) - roundMoney(actualGoods) - roundMoney(extras)));
}

export function parseNonNegMoney(value: unknown): number | null {
	if (value === '' || value == null) return 0;
	const n = Number(value);
	if (!Number.isFinite(n) || n < 0) return null;
	return roundMoney(n);
}

export function capRefundAmount(requested: number, leftoverAmount: number): number | null {
	const amount = roundMoney(requested);
	if (!(amount > 0) || amount > leftoverAmount) return null;
	return amount;
}
