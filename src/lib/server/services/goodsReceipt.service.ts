import { db } from '$lib/server/db';
import { purchaseRepository } from '$lib/server/repositories/purchase.repository';
import { stockTransactionRepository } from '$lib/server/repositories/stockTransaction.repository';
import { allocateReceivedQty, groupByProductType } from '$lib/purchasing/catalog';

export type ReceiveLineInput = {
	itemId?: string;
	productId: string;
	qty: number;
	unitPrice?: number;
};

export function goodsReceiptService() {
	const purchases = purchaseRepository();
	const stockRepo = stockTransactionRepository();

	async function getReceivedByProduct(purchaseId: string): Promise<{
		qtyByProduct: Record<string, number>;
		lastInAtByProduct: Record<string, string>;
	}> {
		const txs = await db.stockTransaction.findMany({
			where: {
				referenceId: purchaseId,
				source: 'PURCHASE',
				type: 'IN',
				deletedAt: null
			},
			select: { productId: true, qty: true, createdAt: true }
		});

		const qtyByProduct: Record<string, number> = {};
		const lastInAtByProduct: Record<string, string> = {};
		for (const tx of txs) {
			qtyByProduct[tx.productId] = (qtyByProduct[tx.productId] ?? 0) + Math.abs(tx.qty);
			const at = tx.createdAt.toISOString();
			if (!lastInAtByProduct[tx.productId] || at > lastInAtByProduct[tx.productId]) {
				lastInAtByProduct[tx.productId] = at;
			}
		}
		return { qtyByProduct, lastInAtByProduct };
	}

	async function getReceiptSummary(purchaseId: string) {
		const purchase = await purchases.findById(purchaseId);
		if (!purchase) return null;

		const { qtyByProduct, lastInAtByProduct } = await getReceivedByProduct(purchaseId);
		const allocated = allocateReceivedQty(
			(purchase.items ?? []).map((item) => ({
				itemId: item.id,
				productId: item.productId,
				qty: item.qty,
				productName: item.product?.name ?? '-',
				productCode: item.product?.code ?? '-',
				unit: item.product?.unit ?? '',
				categoryName: item.product?.category?.name ?? null,
				supplierName: item.supplier?.name ?? purchase.supplier?.name ?? null
			})),
			qtyByProduct
		);

		const lines = allocated.map((item) => {
			const prLine = (purchase.items ?? []).find((i) => i.id === item.itemId);
			return {
			itemId: item.itemId,
			productId: item.productId,
			productName: item.productName,
			productCode: item.productCode,
			unit: item.unit,
			categoryName: item.categoryName,
			supplierName: item.supplierName,
			orderedQty: item.qty,
			orderedPrice: prLine ? Number(prLine.price) : 0,
			receivedQty: item.receivedQty,
			remainingQty: item.remainingQty,
			status: item.status,
			lastInAt: item.receivedQty > 0 ? (lastInAtByProduct[item.productId] ?? null) : null
		};
		});

		const groups = groupByProductType(lines);
		const fullyReceived = lines.every((l) => l.remainingQty === 0);
		const partiallyReceived = lines.some((l) => l.receivedQty > 0) && !fullyReceived;

		return {
			purchase,
			lines,
			groups,
			fullyReceived,
			partiallyReceived,
			canReceive: purchase.approvalStatus === 'APPROVED' && !fullyReceived
		};
	}

	async function receive(
		purchaseId: string,
		lines: ReceiveLineInput[],
		createdBy?: string | null,
		note?: string | null
	) {
		const summary = await getReceiptSummary(purchaseId);
		if (!summary) {
			return { success: false as const, errors: { form: ['Purchasing request not found'] } };
		}
		if (summary.purchase.approvalStatus !== 'APPROVED') {
			return {
				success: false as const,
				errors: { form: ['Only fully approved PRs can be received'] }
			};
		}
		if (summary.fullyReceived) {
			return { success: false as const, errors: { form: ['All items already received'] } };
		}
		if (!Array.isArray(lines) || lines.length === 0) {
			return { success: false as const, errors: { form: ['At least one receive line is required'] } };
		}

		const remainingByItem = Object.fromEntries(summary.lines.map((l) => [l.itemId, l.remainingQty]));
		const productRemaining: Record<string, number> = {};
		for (const line of summary.lines) {
			productRemaining[line.productId] =
				(productRemaining[line.productId] ?? 0) + line.remainingQty;
		}

		const parsed: { productId: string; qty: number; unitPrice: number }[] = [];
		for (const line of lines) {
			const productId = String(line.productId);
			const qty = Number(line.qty);
			if (!productId || Number.isNaN(qty) || qty <= 0) {
				return {
					success: false as const,
					errors: { form: ['Each line needs a product and positive quantity'] }
				};
			}
			const itemId = line.itemId ? String(line.itemId) : '';
			const prLine = itemId
				? summary.lines.find((l) => l.itemId === itemId)
				: summary.lines.find((l) => l.productId === productId);
			const unitPrice =
				line.unitPrice === undefined || line.unitPrice === null || String(line.unitPrice) === ''
					? (prLine?.orderedPrice ?? 0)
					: Number(line.unitPrice);
			if (!Number.isFinite(unitPrice) || unitPrice < 0) {
				return { success: false as const, errors: { form: ['Unit price cannot be negative'] } };
			}

			if (itemId) {
				const remaining = remainingByItem[itemId];
				if (remaining === undefined) {
					return {
						success: false as const,
						errors: { form: ['Item is not on this purchasing request'] }
					};
				}
				if (qty > remaining) {
					return {
						success: false as const,
						errors: {
							form: [`Cannot receive more than remaining qty for this item (${remaining} left)`]
						}
					};
				}
				remainingByItem[itemId] = remaining - qty;
			} else {
				const remaining = productRemaining[productId];
				if (remaining === undefined) {
					return {
						success: false as const,
						errors: { form: ['Product is not on this purchasing request'] }
					};
				}
				if (qty > remaining) {
					return {
						success: false as const,
						errors: {
							form: [`Cannot receive more than remaining qty for product (${remaining} left)`]
						}
					};
				}
				productRemaining[productId] = remaining - qty;
			}
			parsed.push({ productId, qty, unitPrice });
		}

		const created = [];
		for (const line of parsed) {
			const product = await db.product.findFirst({
				where: { id: line.productId, deletedAt: null }
			});
			if (!product) {
				return { success: false as const, errors: { form: ['Product not found'] } };
			}

			const stockAfter = product.stock + line.qty;
			const tx = await stockRepo.create({
				productId: product.id,
				type: 'IN',
				source: 'PURCHASE',
				referenceId: purchaseId,
				qty: line.qty,
				stockBefore: product.stock,
				stockAfter,
				unitPrice: line.unitPrice,
				note: note?.trim() || `Goods receipt for ${summary.purchase.prNumber}`,
				createdBy
			});
			await db.product.update({
				where: { id: product.id },
				data: { stock: stockAfter }
			});
			created.push(tx);
		}

		const refreshed = await getReceiptSummary(purchaseId);
		return { success: true as const, data: { transactions: created, summary: refreshed } };
	}

	return { getReceiptSummary, receive, getReceivedByProduct };
}
