import { db } from '$lib/server/db';
import { purchaseRepository } from '$lib/server/repositories/purchase.repository';
import { stockTransactionRepository } from '$lib/server/repositories/stockTransaction.repository';

export type ReceiveLineInput = {
	productId: string;
	qty: number;
};

export function goodsReceiptService() {
	const purchases = purchaseRepository();
	const stockRepo = stockTransactionRepository();

	async function getReceivedByProduct(purchaseId: string): Promise<Record<string, number>> {
		const txs = await db.stockTransaction.findMany({
			where: {
				referenceId: purchaseId,
				source: 'PURCHASE',
				type: 'IN',
				deletedAt: null
			},
			select: { productId: true, qty: true }
		});

		const map: Record<string, number> = {};
		for (const tx of txs) {
			map[tx.productId] = (map[tx.productId] ?? 0) + Math.abs(tx.qty);
		}
		return map;
	}

	async function getReceiptSummary(purchaseId: string) {
		const purchase = await purchases.findById(purchaseId);
		if (!purchase) return null;

		const receivedMap = await getReceivedByProduct(purchaseId);
		const lines = (purchase.items ?? []).map((item) => {
			const receivedQty = receivedMap[item.productId] ?? 0;
			const remainingQty = Math.max(0, item.qty - receivedQty);
			return {
				itemId: item.id,
				productId: item.productId,
				productName: item.product?.name ?? '-',
				productCode: item.product?.code ?? '-',
				unit: item.product?.unit ?? '',
				orderedQty: item.qty,
				receivedQty,
				remainingQty
			};
		});

		const fullyReceived = lines.every((l) => l.remainingQty === 0);
		const partiallyReceived = lines.some((l) => l.receivedQty > 0) && !fullyReceived;

		return {
			purchase,
			lines,
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

		const remainingByProduct = Object.fromEntries(
			summary.lines.map((l) => [l.productId, l.remainingQty])
		);

		const parsed: { productId: string; qty: number }[] = [];
		for (const line of lines) {
			const productId = String(line.productId);
			const qty = Number(line.qty);
			if (!productId || Number.isNaN(qty) || qty <= 0) {
				return {
					success: false as const,
					errors: { form: ['Each line needs a product and positive quantity'] }
				};
			}
			const remaining = remainingByProduct[productId];
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
			parsed.push({ productId, qty });
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
