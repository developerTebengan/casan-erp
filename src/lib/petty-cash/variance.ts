export function catalogTotal(catalogUnitPrice: number, qty: number): number {
	return roundMoney(catalogUnitPrice * qty);
}

export function varianceRefund(catalogTotalAmount: number, paidAmount: number): number {
	return roundMoney(Math.max(0, catalogTotalAmount - paidAmount));
}

export function extraSpend(catalogTotalAmount: number, paidAmount: number): number {
	return roundMoney(Math.max(0, paidAmount - catalogTotalAmount));
}

export function roundMoney(value: number): number {
	return Math.round(value);
}
