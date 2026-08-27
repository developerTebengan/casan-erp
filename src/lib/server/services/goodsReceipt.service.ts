import { db } from '$lib/server/db';
import { purchaseRepository } from '$lib/server/repositories/purchase.repository';
import { applyProductStockDelta } from '$lib/server/productStock';
import type { FulfillmentStatus, ReadyToReceiveRow } from '$lib/types';

export type ReceiveLineInput = {
	productId: string;
	qty: number;
};

export type ReceiptSummaryFlags = {
	fullyReceived: boolean;
	partiallyReceived: boolean;
	approvalStatus?: string;
};

/** Derive OPEN / PARTIAL / COMPLETE (or N/A) from a receipt summary. */
export function fulfillmentFromReceiptSummary(flags: ReceiptSummaryFlags): FulfillmentStatus {
	if (flags.approvalStatus && flags.approvalStatus !== 'APPROVED') return 'N/A';
	if (flags.fullyReceived) return 'COMPLETE';
	if (flags.partiallyReceived) return 'PARTIAL';
	return 'OPEN';
}

export function goodsReceiptService() {
	const purchases = purchaseRepository();

	async function generateGrnNumber(): Promise<string> {
		const now = new Date();
		const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
		const likePrefix = `GRN-${yyyymm}-`;
		const latest = await db.goodsReceipt.findFirst({
			where: { grnNumber: { startsWith: likePrefix }, deletedAt: null },
			orderBy: { grnNumber: 'desc' },
			select: { grnNumber: true }
		});
		let seq = 1;
		if (latest?.grnNumber) {
			const parts = latest.grnNumber.split('-');
			const last = Number(parts[parts.length - 1]);
			if (!Number.isNaN(last)) seq = last + 1;
		}
		return `${likePrefix}${String(seq).padStart(4, '0')}`;
	}

	async function resolveWarehouseId(warehouseId?: string | null): Promise<string | null> {
		if (warehouseId) {
			const wh = await db.warehouse.findFirst({
				where: { id: warehouseId, deletedAt: null },
				select: { id: true }
			});
			return wh?.id ?? null;
		}
		const def = await db.warehouse.findFirst({
			where: { isDefault: true, deletedAt: null },
			select: { id: true }
		});
		return def?.id ?? null;
	}

	/**
	 * Net PURCHASE-related qty per product for a purchase.
	 * Stock txs use signed qty (IN positive, OUT negative). Summing all
	 * PURCHASE/ADJUSTMENT txs with the same referenceId nets reverses correctly.
	 */
	async function getReceivedByProduct(purchaseId: string): Promise<Record<string, number>> {
		const txs = await db.stockTransaction.findMany({
			where: {
				referenceId: purchaseId,
				source: { in: ['PURCHASE', 'ADJUSTMENT'] },
				deletedAt: null
			},
			select: { productId: true, qty: true }
		});

		const map: Record<string, number> = {};
		for (const tx of txs) {
			map[tx.productId] = (map[tx.productId] ?? 0) + tx.qty;
		}
		for (const productId of Object.keys(map)) {
			map[productId] = Math.max(0, map[productId]);
		}
		return map;
	}

	async function getReceivedByProductBatch(
		purchaseIds: string[]
	): Promise<Record<string, Record<string, number>>> {
		if (purchaseIds.length === 0) return {};
		const txs = await db.stockTransaction.findMany({
			where: {
				referenceId: { in: purchaseIds },
				source: { in: ['PURCHASE', 'ADJUSTMENT'] },
				deletedAt: null
			},
			select: { referenceId: true, productId: true, qty: true }
		});

		const byPurchase: Record<string, Record<string, number>> = {};
		for (const tx of txs) {
			if (!tx.referenceId) continue;
			if (!byPurchase[tx.referenceId]) byPurchase[tx.referenceId] = {};
			byPurchase[tx.referenceId][tx.productId] =
				(byPurchase[tx.referenceId][tx.productId] ?? 0) + tx.qty;
		}
		for (const pid of Object.keys(byPurchase)) {
			for (const productId of Object.keys(byPurchase[pid])) {
				byPurchase[pid][productId] = Math.max(0, byPurchase[pid][productId]);
			}
		}
		return byPurchase;
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

		const fullyReceived = lines.length > 0 && lines.every((l) => l.remainingQty === 0);
		const partiallyReceived = lines.some((l) => l.receivedQty > 0) && !fullyReceived;
		const fulfillmentStatus = fulfillmentFromReceiptSummary({
			fullyReceived,
			partiallyReceived,
			approvalStatus: purchase.approvalStatus
		});

		return {
			purchase,
			lines,
			fullyReceived,
			partiallyReceived,
			fulfillmentStatus,
			canReceive: purchase.approvalStatus === 'APPROVED' && !fullyReceived
		};
	}

	async function listReadyToReceive(): Promise<ReadyToReceiveRow[]> {
		const approved = await purchases.findAll({
			approvalStatus: 'APPROVED',
			page: 1,
			limit: 200
		});

		const ready: ReadyToReceiveRow[] = [];
		for (const purchase of approved.data) {
			const summary = await getReceiptSummary(purchase.id);
			if (!summary?.canReceive) continue;

			const orderedQty = summary.lines.reduce((sum, l) => sum + l.orderedQty, 0);
			const receivedQty = summary.lines.reduce((sum, l) => sum + l.receivedQty, 0);
			const remainingQty = summary.lines.reduce((sum, l) => sum + l.remainingQty, 0);
			const remainingLines = summary.lines.filter((l) => l.remainingQty > 0).length;

			ready.push({
				...summary.purchase,
				remainingLines,
				remainingQty,
				orderedQty,
				receivedQty,
				fulfillmentStatus: summary.fulfillmentStatus,
				canReceive: true
			});
		}

		return ready;
	}

	async function receive(
		purchaseId: string,
		lines: ReceiveLineInput[],
		createdBy?: string | null,
		note?: string | null,
		warehouseId?: string | null
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

		const resolvedWarehouseId = await resolveWarehouseId(warehouseId);
		const grnNumber = await generateGrnNumber();
		const receiptNote = note?.trim() || `Goods receipt for ${summary.purchase.prNumber}`;

		try {
			const created = await db.$transaction(async (tx) => {
				const goodsReceipt = await tx.goodsReceipt.create({
					data: {
						grnNumber,
						purchaseId,
						warehouseId: resolvedWarehouseId,
						note: receiptNote,
						createdBy,
						lines: {
							create: parsed.map((line) => ({
								productId: line.productId,
								qty: line.qty
							}))
						}
					}
				});

				const transactions = [];
				for (const line of parsed) {
					const product = await tx.product.findFirst({
						where: { id: line.productId, deletedAt: null }
					});
					if (!product) {
						throw new Error('PRODUCT_NOT_FOUND');
					}

					const stockAfter = product.stock + line.qty;
					const stockTx = await tx.stockTransaction.create({
						data: {
							productId: product.id,
							type: 'IN',
							source: 'PURCHASE',
							referenceId: purchaseId,
							warehouseId: resolvedWarehouseId,
							qty: line.qty,
							stockBefore: product.stock,
							stockAfter,
							note: receiptNote,
							createdBy
						},
						include: {
							product: {
								include: { category: { select: { id: true, name: true } } }
							}
						}
					});
					await tx.product.update({
						where: { id: product.id },
						data: { stock: stockAfter }
					});

					if (resolvedWarehouseId) {
						await applyProductStockDelta(
							tx,
							product.id,
							resolvedWarehouseId,
							line.qty,
							product.stock
						);
					}

					transactions.push(stockTx);
				}

				return { goodsReceipt, transactions };
			});

			const refreshed = await getReceiptSummary(purchaseId);
			return {
				success: true as const,
				data: {
					goodsReceipt: created.goodsReceipt,
					transactions: created.transactions,
					summary: refreshed
				}
			};
		} catch (e) {
			if (e instanceof Error && e.message === 'PRODUCT_NOT_FOUND') {
				return { success: false as const, errors: { form: ['Product not found'] } };
			}
			throw e;
		}
	}

	async function listByPurchase(purchaseId: string) {
		const receipts = await db.goodsReceipt.findMany({
			where: { purchaseId, deletedAt: null },
			orderBy: { createdAt: 'desc' },
			include: {
				warehouse: true,
				lines: {
					include: {
						product: {
							include: { category: { select: { id: true, name: true } } }
						}
					}
				}
			}
		});

		return receipts.map((r) => ({
			id: r.id,
			grnNumber: r.grnNumber,
			purchaseId: r.purchaseId,
			warehouseId: r.warehouseId,
			warehouse: r.warehouse
				? {
						id: r.warehouse.id,
						code: r.warehouse.code,
						name: r.warehouse.name,
						isDefault: r.warehouse.isDefault
					}
				: null,
			note: r.note,
			createdBy: r.createdBy,
			createdAt: r.createdAt.toISOString(),
			lines: r.lines.map((l) => ({
				productId: l.productId,
				qty: l.qty,
				product: l.product
					? {
							id: l.product.id,
							code: l.product.code,
							name: l.product.name,
							categoryId: l.product.categoryId,
							category: l.product.category ?? undefined,
							unit: l.product.unit,
							stock: l.product.stock,
							minimumStock: l.product.minimumStock,
							price: Number(l.product.price),
							status: l.product.status as 'ACTIVE' | 'INACTIVE',
							createdAt: l.product.createdAt.toISOString(),
							updatedAt: l.product.updatedAt.toISOString()
						}
					: undefined
			}))
		}));
	}

	async function getById(id: string) {
		const r = await db.goodsReceipt.findFirst({
			where: { id, deletedAt: null },
			include: {
				warehouse: true,
				purchase: {
					include: {
						supplier: true,
						requester: { select: { id: true, name: true, email: true, role: true } }
					}
				},
				lines: {
					include: {
						product: {
							include: { category: { select: { id: true, name: true } } }
						}
					}
				}
			}
		});
		if (!r) return null;

		return {
			id: r.id,
			grnNumber: r.grnNumber,
			purchaseId: r.purchaseId,
			warehouseId: r.warehouseId,
			warehouse: r.warehouse
				? {
						id: r.warehouse.id,
						code: r.warehouse.code,
						name: r.warehouse.name,
						isDefault: r.warehouse.isDefault
					}
				: null,
			note: r.note,
			createdBy: r.createdBy,
			createdAt: r.createdAt.toISOString(),
			purchase: r.purchase
				? {
						id: r.purchase.id,
						prNumber: r.purchase.prNumber,
						supplier: r.purchase.supplier
							? {
									id: r.purchase.supplier.id,
									name: r.purchase.supplier.name,
									phone: r.purchase.supplier.phone,
									address: r.purchase.supplier.address
								}
							: null,
						requester: r.purchase.requester,
						department: r.purchase.department
					}
				: undefined,
			lines: r.lines.map((l) => ({
				productId: l.productId,
				qty: l.qty,
				product: l.product
					? {
							id: l.product.id,
							code: l.product.code,
							name: l.product.name,
							unit: l.product.unit,
							categoryId: l.product.categoryId,
							stock: l.product.stock,
							minimumStock: l.product.minimumStock,
							price: Number(l.product.price),
							status: l.product.status as 'ACTIVE' | 'INACTIVE',
							createdAt: l.product.createdAt.toISOString(),
							updatedAt: l.product.updatedAt.toISOString()
						}
					: undefined
			}))
		};
	}

	return {
		getReceiptSummary,
		listReadyToReceive,
		receive,
		getReceivedByProduct,
		getReceivedByProductBatch,
		listByPurchase,
		getById
	};
}
