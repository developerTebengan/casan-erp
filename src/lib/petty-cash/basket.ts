import { catalogTotal, extraSpend, varianceRefund } from '$lib/petty-cash/variance';

export type BasketLine = {
	productId: string;
	supplierId: string;
	qty: number;
	paidAmount: number;
	actualUnitPrice: number | null;
	updateCatalogPrice: boolean;
	note: string | null;
};

export type BasketLineDisplay = {
	// includes line identifiers + product catalog unit price snapshot for simulation
	line: BasketLine;
	catalogUnitPrice: number;
};

export type BasketTotals = {
	catalogTotal: number;
	paidTotal: number;
	refundTotal: number;
	extraTotal: number;
	afterCheckout: number;
};

export function computeBasketTotals(lines: BasketLineDisplay[], currentBalance: number): BasketTotals {
	let catalogTotalAmount = 0;
	let paidTotalAmount = 0;
	let refundTotalAmount = 0;
	let extraTotalAmount = 0;

	for (const item of lines) {
		const catalog = catalogTotal(item.catalogUnitPrice, item.line.qty);
		const paid = item.line.paidAmount;
		catalogTotalAmount += catalog;
		paidTotalAmount += paid;
		refundTotalAmount += varianceRefund(catalog, paid);
		extraTotalAmount += extraSpend(catalog, paid);
	}

	return {
		catalogTotal: catalogTotalAmount,
		paidTotal: paidTotalAmount,
		refundTotal: refundTotalAmount,
		extraTotal: extraTotalAmount,
		afterCheckout: currentBalance - paidTotalAmount
	};
}

export function basketCheckoutAllowed(lines: BasketLineDisplay[], currentBalance: number): boolean {
	return lines.length > 0 && computeBasketTotals(lines, currentBalance).afterCheckout >= 0;
}

