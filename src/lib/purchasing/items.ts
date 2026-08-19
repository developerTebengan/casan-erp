export type ParsedPurchaseItem = {
	productId: string;
	qty: number;
	price: number;
	notes?: string;
	supplierId: string;
};

export function parsePurchaseItems(
	items: unknown
): { valid: true; data: ParsedPurchaseItem[] } | { valid: false; errors: string } {
	if (!Array.isArray(items) || items.length === 0) {
		return { valid: false, errors: 'At least one item is required' };
	}
	const parsed: ParsedPurchaseItem[] = [];
	for (const item of items) {
		const row = item as Record<string, unknown>;
		if (!row.productId || !row.qty || row.price === undefined || row.price === null) {
			return { valid: false, errors: 'Each item must have product, quantity, and price' };
		}
		if (!row.supplierId) {
			return { valid: false, errors: 'Each item must have a supplier' };
		}
		const qty = Number(row.qty);
		const price = Number(row.price);
		if (Number.isNaN(qty) || qty <= 0) {
			return { valid: false, errors: 'Quantity must be a positive number' };
		}
		if (Number.isNaN(price) || price < 0) {
			return { valid: false, errors: 'Price must be a non-negative number' };
		}
		parsed.push({
			productId: String(row.productId),
			qty,
			price,
			notes: row.notes ? String(row.notes) : undefined,
			supplierId: String(row.supplierId)
		});
	}
	return { valid: true, data: parsed };
}
